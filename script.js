// ==========================================
// TARGET ACHIEVER - GROQ AI ROADMAP GENERATOR
// ==========================================

// Safely retrieve API key from browser localStorage or config
// Replace your current getApiKey() function with this one:
localStorage.getItem("GROQ_API_KEY")
function getApiKey() {
    let key = localStorage.getItem('GROQ_API_KEY');
    
    if (!key) {
        key = prompt("Please enter your Groq API Key (get a free key at console.groq.com):");
        if (key && key.trim() !== '') {
            key = key.trim();
            localStorage.setItem('GROQ_API_KEY', key);
        }
    }
    return key;
}

document.addEventListener('DOMContentLoaded', async () => {
    const goalText = localStorage.getItem('userGoal') || "Full Stack Web Development";
    const deadlineDateStr = localStorage.getItem('userDeadline');

    if (!deadlineDateStr) {
        window.location.href = 'planner.html';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineDateStr);

    const timeDiff = deadline.getTime() - today.getTime();
    let totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    if (totalDays <= 0) totalDays = 1;

    // Display Header Information
    const titleElem = document.getElementById('displayTitle');
    const deadlineElem = document.getElementById('displayDeadline');
    const durationElem = document.getElementById('displayDuration');

    if (titleElem) titleElem.innerText = goalText;
    if (deadlineElem) deadlineElem.innerText = deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (durationElem) durationElem.innerText = `${totalDays} ${totalDays === 1 ? 'Day' : 'Days'}`;

    const apiKey = getApiKey();

    if (!apiKey) {
        showError("API Key Missing", "A valid Groq API key is required to generate the AI roadmap.");
        return;
    }

    try {
        const roadmapData = await fetchGroqRoadmap(goalText, totalDays, apiKey);
        renderRoadmap(roadmapData, today);
    } catch (error) {
        console.error("Groq AI Error:", error);
        showError("Generation Error", error.message);
    }
});

// Call Groq Llama-3.1-8b-instant API with strict day length enforcement
async function fetchGroqRoadmap(goalText, totalDays, apiKey) {
    const maxDaysToGenerate = Math.min(totalDays, 30); 

    const systemPrompt = `You are an expert curriculum designer. Return ONLY a valid JSON object matching this exact schema:
{
  "days": [
    {
      "dayNum": 1,
      "title": "Topic Name",
      "estHours": "4 Hours",
      "isRevision": false,
      "tasks": [
        "Actionable sub-task 1",
        "Actionable sub-task 2"
      ]
    }
  ]
}`;

    const userPrompt = `Create a detailed day-by-day learning roadmap for: "${goalText}".
CRITICAL INSTRUCTION: You MUST generate EXACTLY ${maxDaysToGenerate} day objects in the "days" array—no more, no less.
Do NOT generate extra days past day ${maxDaysToGenerate}.
${maxDaysToGenerate > 3 ? `Set "isRevision": true on the final day (Day ${maxDaysToGenerate}).` : 'Do NOT add extra revision days beyond the total count.'}
Keep descriptions concise, clear, and actionable.`;

    const endpoint = "https://api.groq.com/openai/v1/chat/completions";

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
        })
    });


    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Groq API Error ${response.status}`);
    }

    const data = await response.json();
    const rawJSON = data.choices[0].message.content;
    const parsedData = JSON.parse(rawJSON);

    // Hard fallback slice to ensure array length never exceeds totalDays
    if (parsedData.days && parsedData.days.length > maxDaysToGenerate) {
        parsedData.days = parsedData.days.slice(0, maxDaysToGenerate);
    }

    return parsedData;
}

// Display Error Message Component
function showError(title, message) {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.innerHTML = `
            <h3 style="color: #ff6b6b; margin-bottom: 0.5rem;">${title}</h3>
            <p style="color: #e0be75; font-size: 0.9rem; max-width: 600px; margin: 0 auto; line-height: 1.5;">
                ${message}
            </p>
        `;
    }
}

// Render Action Cards to UI
function renderRoadmap(data, startDate) {
    const timelineGrid = document.getElementById('timelineGrid');
    if (!timelineGrid) return;

    timelineGrid.innerHTML = '';

    let totalCheckboxes = 0;

    data.days.forEach((dayData, index) => {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + index);
        const dateFormatted = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        totalCheckboxes += dayData.tasks.length;

        const dayCard = document.createElement('div');
        dayCard.className = `day-card ${dayData.isRevision ? 'buffer-day' : ''}`;

        let taskListHTML = '';
        dayData.tasks.forEach((task, tIdx) => {
            const taskId = `task-${dayData.dayNum}-${tIdx}`;
            taskListHTML += `
                <li class="task-item">
                    <input type="checkbox" id="${taskId}" class="gold-checkbox task-checkbox">
                    <label for="${taskId}">${task}</label>
                </li>
            `;
        });

        dayCard.innerHTML = `
            <div class="day-header">
                <div class="day-badge ${dayData.isRevision ? 'gold-badge' : ''}">
                    DAY ${String(dayData.dayNum).padStart(2, '0')} ${dayData.isRevision ? '• REVISION' : ''}
                </div>
                <span class="day-date">${dateFormatted}</span>
            </div>
            <h3 class="day-title">${dayData.title}</h3>
            <span class="est-time">⏱️ Estimated: ${dayData.estHours || '4.0 Hours'}</span>
            <ul class="task-list">
                ${taskListHTML}
            </ul>
        `;

        timelineGrid.appendChild(dayCard);
    });

    // Setup Progress Bar Interactivity
    const checkboxes = document.querySelectorAll('.task-checkbox');
    checkboxes.forEach(box => {
        box.addEventListener('change', () => {
            const checkedCount = document.querySelectorAll('.task-checkbox:checked').length;
            const percentage = Math.round((checkedCount / totalCheckboxes) * 100);

            const percentageElem = document.getElementById('displayPercentage');
            const progressFillElem = document.getElementById('progressBarFill');

            if (percentageElem) percentageElem.innerText = `${percentage}%`;
            if (progressFillElem) progressFillElem.style.width = `${percentage}%`;
        });
    });
}
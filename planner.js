// < !--JavaScript to store user inputs and redirect-- >

// Set minimum date selector to today
document.getElementById('targetDeadline').min = new Date().toISOString().split('T')[0];

document.getElementById('targetForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const details = document.getElementById('targetDetails').value;
    const deadline = document.getElementById('targetDeadline').value;

    // Save data locally
    localStorage.setItem('userGoal', details);
    localStorage.setItem('userDeadline', deadline);

    // Redirect to dynamic results page
    window.location.href = 'results.html';
});


// <!--Indian Standard Time(IST) Analog Clock Script-- >

function updateClockIST() {
    const now = new Date();

    // Explicitly parse current time in Indian Standard Time (Asia/Kolkata)
    const istTimeString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istTimeString);

    const seconds = istDate.getSeconds();
    const minutes = istDate.getMinutes();
    const hours = istDate.getHours();

    // Calculate rotation degrees for clock hands
    const secondDeg = (seconds / 60) * 360;
    const minuteDeg = ((minutes + seconds / 60) / 60) * 360;
    const hourDeg = (((hours % 12) + minutes / 60) / 12) * 360;

    const secondHand = document.getElementById('secondHand');
    const minuteHand = document.getElementById('minuteHand');
    const hourHand = document.getElementById('hourHand');

    if (secondHand) secondHand.style.transform = `rotate(${secondDeg}deg)`;
    if (minuteHand) minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
    if (hourHand) hourHand.style.transform = `rotate(${hourDeg}deg)`;
}

// Start ticking immediately and update every second
document.addEventListener('DOMContentLoaded', () => {
    updateClockIST();
    setInterval(updateClockIST, 1000);
});

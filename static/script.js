function getRecommendations() {

    const data = {
        interest: document.getElementById("interest").value,
        price: document.getElementById("price").value,
        duration: document.getElementById("duration").value,
        level: document.getElementById("level").value
    };

    fetch('/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(data => {

        let output = "<h2>Recommended Courses:</h2>";

        if (data.length === 0) {
            output += "<p>No courses found!</p>";
        } else {
            data.forEach(course => {
                output += `
                    <div>
                        <h3>${course.title}</h3>
                        <p>${course.features}</p>
                    </div>
                    <hr>
                `;
            });
        }

        document.getElementById("results").innerHTML = output;
    });
}
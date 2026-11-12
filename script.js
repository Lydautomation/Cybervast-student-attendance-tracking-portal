
// ======================================
// CYBERVAST STUDENT ATTENDANCE PORTAL
// ======================================

// 1. N8N WEBHOOK URLS
// Replace these with the actual production URLs later.

const GET_STUDENTS_WEBHOOK = "https://lydautomation-n8n.duckdns.org/webhook-test/cybervast-load-students";
const SUBMIT_ATTENDANCE_WEBHOOK = "https://lydautomation-n8n.duckdns.org/webhook-test/cybervast-submit-attendance";


// 2. COURSE OPTIONS
// Replace or add courses using Cybervast's official course names.

const courses = [
    "AI Automation",
    "Data Analysis"
];


// 3. TRAINING SESSION OPTIONS

const sessions = [];

for (let week = 1; week <= 12; week++) {
    for (let classNumber = 1; classNumber <= 3; classNumber++) {
        sessions.push(`Week ${week} – Class ${classNumber}`);
    }
}


// 4. GET FORM ELEMENTS

const courseSelect = document.getElementById("course");
const sessionSelect = document.getElementById("session");
const loadButton = document.getElementById("loadStudents");
const submitButton = document.getElementById("submitAttendance");
const studentSection = document.getElementById("studentSection");
const studentList = document.getElementById("studentList");
const message = document.getElementById("message");


// 5. ADD TUTOR NAME FIELD

const tutorLabel = document.createElement("label");
tutorLabel.textContent = "Tutor Name";
tutorLabel.htmlFor = "tutorName";

const tutorInput = document.createElement("input");
tutorInput.type = "text";
tutorInput.id = "tutorName";
tutorInput.placeholder = "Enter your name";
tutorInput.required = true;

tutorInput.style.width = "100%";
tutorInput.style.padding = "15px";
tutorInput.style.border = "1px solid #E9E4F0";
tutorInput.style.borderRadius = "9px";
tutorInput.style.fontSize = "14px";

const attendanceForm = document.getElementById("attendanceForm");

attendanceForm.insertBefore(tutorLabel, loadButton);
attendanceForm.insertBefore(tutorInput, loadButton);


// 6. POPULATE DROPDOWNS

courses.forEach(course => {
    const option = document.createElement("option");
    option.value = course;
    option.textContent = course;
    courseSelect.appendChild(option);
});

sessions.forEach(session => {
    const option = document.createElement("option");
    option.value = session;
    option.textContent = session;
    sessionSelect.appendChild(option);
});


// 7. DISPLAY MESSAGES

function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? "#C62828" : "#54218F";
}


// 8. LOAD STUDENTS FROM N8N

loadButton.addEventListener("click", async () => {

    const course = courseSelect.value;
    const trainingSession = sessionSelect.value;
    const tutor = tutorInput.value.trim();

    if (!course || !trainingSession || !tutor) {
        showMessage("Please select a course, training session and enter your name.", true);
        return;
    }

    if (GET_STUDENTS_WEBHOOK.includes("PASTE_")) {
        showMessage("The student retrieval Webhook has not been connected yet.", true);
        return;
    }

    loadButton.disabled = true;
    loadButton.textContent = "Loading students...";
    showMessage("Retrieving student records...");

    try {

        const response = await fetch(GET_STUDENTS_WEBHOOK, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain"
            },
            body: JSON.stringify({
                course: course,
                trainingSession: trainingSession,
                tutor: tutor
            })
        });

        if (!response.ok) {
            throw new Error("Unable to retrieve students.");
        }

        const data = await response.json();

        const students = data.students;

        if (!Array.isArray(students)) {
            throw new Error("The response did not contain a valid student list.");
        }

        if (students.length === 0) {
            studentSection.hidden = true;
            showMessage("No students were found for this course.", true);
            return;
        }

        displayStudents(students);

        showMessage(`${students.length} students loaded successfully.`);

    } catch (error) {

        console.error(error);
        showMessage(error.message || "Something went wrong while loading students.", true);

    } finally {

        loadButton.disabled = false;
        loadButton.textContent = "Load Students";

    }

});


// 9. DISPLAY RETRIEVED STUDENTS

let loadedStudents = [];

function displayStudents(students) {

    loadedStudents = students;

    studentList.innerHTML = "";

    students.forEach((student, index) => {

        const card = document.createElement("div");
        card.className = "student-card";

        const name = document.createElement("p");
        name.className = "student-name";
        name.textContent = student.fullName;

        const id = document.createElement("p");
        id.className = "student-id";
        id.textContent = student.studentId;

        const options = document.createElement("div");
        options.className = "attendance-options";

        ["Present", "Absent"].forEach(status => {

            const label = document.createElement("label");

            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = `attendance-${index}`;
            radio.value = status;
            radio.required = true;

            label.appendChild(radio);
            label.appendChild(document.createTextNode(status));

            options.appendChild(label);

        });

        card.appendChild(name);
        card.appendChild(id);
        card.appendChild(options);

        studentList.appendChild(card);

    });

    studentSection.hidden = false;

}


// 10. SUBMIT ATTENDANCE TO N8N

submitButton.addEventListener("click", async () => {

    const course = courseSelect.value;
    const trainingSession = sessionSelect.value;
    const tutor = tutorInput.value.trim();

    if (loadedStudents.length === 0) {
        showMessage("Please load students first.", true);
        return;
    }

    const attendanceRecords = [];

    for (let index = 0; index < loadedStudents.length; index++) {

        const selected = document.querySelector(
            `input[name="attendance-${index}"]:checked`
        );

        if (!selected) {
            showMessage("Please mark attendance for every student.", true);
            return;
        }

        const student = loadedStudents[index];

        attendanceRecords.push({
            studentId: student.studentId,
            fullName: student.fullName,
            emailAddress: student.emailAddress,
            phoneNumber: student.phoneNumber,
            course: course,
            trainingSession: trainingSession,
            attendanceStatus: selected.value,
            tutor: tutor
        });

    }

    if (SUBMIT_ATTENDANCE_WEBHOOK.includes("PASTE_")) {
        showMessage("The attendance submission Webhook has not been connected yet.", true);
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {

        const response = await fetch(SUBMIT_ATTENDANCE_WEBHOOK, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                course: course,
                trainingSession: trainingSession,
                tutor: tutor,
                attendanceRecords: attendanceRecords
            })
        });

        if (!response.ok) {
            throw new Error("Attendance submission failed.");
        }

        showMessage("Attendance submitted successfully!");

        studentSection.hidden = true;
        studentList.innerHTML = "";
        loadedStudents = [];

    } catch (error) {

        console.error(error);
        showMessage(error.message || "Unable to submit attendance.", true);

    } finally {

        submitButton.disabled = false;
        submitButton.textContent = "Submit Attendance";

    }

});

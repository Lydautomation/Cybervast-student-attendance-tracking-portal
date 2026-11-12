
// ======================================
// CYBERVAST STUDENT ATTENDANCE PORTAL
// ======================================


// 1. N8N WEBHOOK URLS

const GET_STUDENTS_WEBHOOK = "https://lydautomation-n8n.duckdns.org/webhook-test/cybervast-load-students";

const SUBMIT_ATTENDANCE_WEBHOOK = "https://lydautomation-n8n.duckdns.org/webhook-test/cybervast-submit-attendance";


// 2. CYBERVAST COURSE OPTIONS

const courses = [
    "Cybersecurity",
    "AI Automation",
    "Front-End Development",
    "UI/UX Design",
    "Virtual Assistants",
    "Project Management",
    "Digital Marketing",
    "Data Analysis"
];


// 3. TRAINING SESSION OPTIONS
// 12 weeks × 3 classes = 36 sessions

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


// 6. POPULATE COURSE DROPDOWN

courses.forEach(course => {
    const option = document.createElement("option");
    option.value = course;
    option.textContent = course;
    courseSelect.appendChild(option);
});


// 7. POPULATE SESSION DROPDOWN

function populateSessions(nextSession = "") {

    sessionSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select Training Session";
    placeholder.disabled = true;
    placeholder.selected = true;

    sessionSelect.appendChild(placeholder);

    sessions.forEach(session => {

        const option = document.createElement("option");
        option.value = session;

        if (session === nextSession) {
            option.textContent = `${session} (Next Session)`;
        } else {
            option.textContent = session;
        }

        sessionSelect.appendChild(option);

    });

    if (nextSession && sessions.includes(nextSession)) {
        sessionSelect.value = nextSession;
    }

}

populateSessions();


// 8. DISPLAY MESSAGES

function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? "#C62828" : "#54218F";
}


// 9. LOAD STUDENTS AND NEXT UNRECORDED SESSION

loadButton.addEventListener("click", async () => {

    const course = courseSelect.value;
    const tutor = tutorInput.value.trim();

    if (!course || !tutor) {
        showMessage("Please select a course and enter your name.", true);
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

        // Select the next unrecorded session returned by n8n.
        if (data.nextSession && sessions.includes(data.nextSession)) {

            populateSessions(data.nextSession);

            showMessage(
                `${students.length} students loaded. Next unrecorded session: ${data.nextSession}.`
            );

        } else {

            populateSessions();

            showMessage(
                `${students.length} students loaded. Please select a training session.`,
                true
            );

        }

        displayStudents(students);

    } catch (error) {

        console.error(error);
        showMessage(error.message || "Something went wrong while loading students.", true);

    } finally {

        loadButton.disabled = false;
        loadButton.textContent = "Load Students";

    }

});


// 10. DISPLAY RETRIEVED STUDENTS

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


// 11. SUBMIT ATTENDANCE TO N8N

submitButton.addEventListener("click", async () => {

    const course = courseSelect.value;
    const trainingSession = sessionSelect.value;
    const tutor = tutorInput.value.trim();

    if (!course || !trainingSession || !tutor) {
        showMessage("Please select a course, training session and enter your name.", true);
        return;
    }

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

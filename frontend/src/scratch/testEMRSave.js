async function test() {
    try {
        const loginRes = await fetch('http://localhost:8080/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'doctor1@gmail.com', password: '123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.data.token;
        console.log('Token:', token ? 'OK' : 'FAIL');

        // Let's list appointments to find an appointment ID
        const appRes = await fetch('http://localhost:8080/api/v1/appointments/doctor/' + loginData.data.doctorId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const appData = await appRes.json();
        if(!appData.data || appData.data.length === 0) {
            console.log('No appointments');
            return;
        }
        const app = appData.data[0];
        console.log('App:', app.id);

        const saveRes = await fetch('http://localhost:8080/api/v1/emr/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
                appointmentId: app.id,
                doctorId: loginData.data.doctorId,
                chiefComplaint: 'Mỏi mắt',
                status: 'IN_PROGRESS'
            })
        });
        const saveData = await saveRes.json();
        console.log('Save Data:', saveData);
    } catch (e) {
        console.error(e);
    }
}
test();

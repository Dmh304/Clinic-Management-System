const axios = require('axios');

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:8080/api/v1/auth/login', {
      email: 'doctor@example.com', // I don't know the doctor email. Wait!
      password: '123'
    });
    console.log("Logged in");
  } catch (err) {
    console.error(err.message);
  }
}
test();

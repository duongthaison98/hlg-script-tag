const BaseUrl = 'https://graph.gplay.vn';

const formData = {};

const form1 = document.getElementById("form1");
const inputs = form1.querySelectorAll('input, select, textarea');
const btnSubmit1 = document.getElementById("btnSubmitForm1");

for (let i = 0; i < inputs.length; i++) {
  inputs[i].addEventListener('input', async (e) => {
    formData[e.target.name] = e.target.value;
    await handleSaveData();
    console.log('formData', formData);
  })
}


btnSubmit1.addEventListener("click", (e) => {
  handleSaveData();
});
async function handleSaveData() {
  try {
    const res = await fetch(`${BaseUrl}/developer/api/v2.0/banners/100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // body: JSON.stringify(formData),
    });
    
  } catch (error) {
    console.log(error);
  }
}

// Detect when the user switches tabs or closes the tab
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    console.log('User has switched to another tab or minimized the window.');
    // Handle logic for when the user leaves the tab
  }
});

// Warn user before leaving the page
window.addEventListener('beforeunload', function (event) {
  event.preventDefault();
  event.returnValue = '';

  console.log('beforeunload');
  
  return '';
});
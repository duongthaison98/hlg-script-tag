const BASE_URL = "https://api-hlg-dev.human-life.vn";
let pageSettingId = "cm51uqufc0010nzzxx9n5yzmo";
let apiKey = "2b83e9cc-fda0-4a9c-ae09-b203e95e43e3";
let debounceTimer,
  formData = [],
  currentFormData = {},
  lstUUid = [];
let clientId = localStorage.getItem("clientId");
const fullUrl = window.location.href;

(async function init() {
  try {
    const formSettingsData = await getCmsFormSettings();
    if (formSettingsData?.length) setupFormListeners(formSettingsData);

    await getStart();
  } catch (error) {
    console.error("Initialization error:", error);
  }
})();

function setupFormListeners(formSettingsData) {
  formSettingsData.forEach(function (formSetting) {
    formData.push({ formSettingId: formSetting.id, ObjetctData: {} });
    lstUUid.push({ formSettingId: formSetting.id, uuid: "" });

    formSetting.settings.forEach(function (field) {
      formData[formData.length - 1].ObjetctData[field.label] = "";

      field.arrAttributes.forEach(function (attr) {
        var inputElement = document.querySelector(
          "[" + attr.attribute + '="' + attr.attributeVal + '"]'
        );

        if (inputElement) {
          if (field.label === "isSubmit") {
            // Listen for click events when the label is "isSubmit"
            inputElement.addEventListener("click", function () {
              updateFormData(formSetting.id, field.label, true);
            });
          } else {
            inputElement.addEventListener("input", function () {
              var value;

              if (inputElement.type === "checkbox") {
                value = inputElement.checked ? true : false;
              } else {
                value = field.arrAttributes
                  .map(function (attribute) {
                    var element = document.querySelector(
                      "[" +
                        attribute.attribute +
                        '="' +
                        attribute.attributeVal +
                        '"]'
                    );
                    return element ? element.value.trim() : "";
                  })
                  .join("");
              }

              updateFormData(formSetting.id, field.label, value);
            });
          }
        }
      });
    });
  });
}

function updateFormData(formId, label, inputValue) {
  //detect which current form that user typing from multiple forms
  const selectedFormData = formData.find(
    (item) => item.formSettingId === formId
  );

  if (selectedFormData) {
    //set current form global
    currentFormData = selectedFormData;

    //prepare payload data
    selectedFormData.ObjetctData[label] = inputValue;
  }

  //send data after 300ms
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => handleSaveData(selectedFormData), 300);
}

//send user data
async function handleSaveData(formInfo) {
  try {
    if (!formInfo.formSettingId) throw "Form settingId not found";

    //check existed uuid by formSettingId, if true set objectId
    const currentUuid = lstUUid.find(
      (item) => item.formSettingId === formInfo.formSettingId
    );
    if (currentUuid?.uuid) formInfo.objectId = currentUuid.uuid;
    if (clientId) formInfo.clientId = clientId;

    const response = await fetch(
      "https://api-hlg-dev.human-life.vn/api/form/users-list/upsert-data",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(formInfo),
      }
    );
    if (!response.ok) throw response.status;

    const resData = await response.json();
    if (!resData.data) throw "Script tag error";

    //if uuid is empty, save uuid to currentUuid so every call later payload have appropriate objectId by each form
    if (currentUuid && !currentUuid.uuid) currentUuid.uuid = resData.data.uuid;
  } catch (error) {
    throw new Error(error);
  }
}

//get cms settings
async function getCmsFormSettings() {
  try {
    if (!pageSettingId) throw "Page settings not found";

    const response = await fetch(
      "https://api-hlg-dev.human-life.vn/api/form?pageSettingId=" +
        pageSettingId +
        "&status=true",
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      }
    );
    if (!response.ok) throw response.status;

    const { data } = await response.json();

    if (!data && !data.length) throw "Form settings not found";

    //if user not in the config url
    const configPageUrl =
      data[0].pageSettings.page.domain + "/" + data[0].pageSettings.pageUri;
    // if (fullUrl !== configPageUrl)
    //   throw "Form settings not applicable to this page";

    return data.map((item) => ({
      id: item.id,
      settings: item.settings,
    }));
  } catch (error) {
    throw new Error(error);
  }
}

//get start api
async function getStart() {
  try {
    if (!clientId) {
      clientId = generateClientId();
      localStorage.setItem("clientId", clientId);
    }

    const response = await fetch(
      "https://api-hlg-dev.human-life.vn/api/product-messages/start",
      {
        method: "POST",
        headers: new Headers({ "content-type": "application/json" }),
        body: JSON.stringify({ clientId, currentUrl: location.href }),
      }
    );
    if (!response.ok) throw response.status;

    const { data } = await response.json();

    //if data have isConverted, remove clientId
    if (data.isConverted) {
      localStorage.removeItem("clientId");
    }
  } catch (error) {
    throw new Error(error);
  }
}

//generate random clientId
function generateClientId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Detect when the user switches tabs or closes the tab
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    if (currentFormData.formSettingId) {
      handleSaveData(currentFormData);
    }
  }
});

// Detect when the user leaving the page
window.addEventListener("pagehide", function () {
  if (currentFormData.formSettingId) {
    handleSaveData(currentFormData);
  }
});

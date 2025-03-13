const BASE_URL = "https://api-hlg-dev.human-life.vn";
let pageSettingId = "cm7vn3q7f007i15epgjbizm02";
let apiKey = "e070997c-ba64-43e1-bbd5-6cebc54dda89";
let debounceTimer,
  formData = [],
  currentFormData = {},
  lstUUid = [];
let clientId = localStorage.getItem("clientId") || "";
const fullUrl = window.location.href;
let agencyId = "";
const FormFields = {
  Phone: "phone",
  Email: "email",
  ProductName: "productName",
  IsPolicy: "isPolicy",
  IsSubmit: "isSubmit",
};

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
  formSettingsData.forEach((formSetting) => {
    formData.push({ formSettingId: formSetting.id, ObjectData: {} });
    lstUUid.push({ formSettingId: formSetting.id, uuid: "" });

    formSetting.settings.forEach((field) => {
      if (
        field.label === FormFields.IsSubmit ||
        field.label === FormFields.IsPolicy
      ) {
        formData[formData.length - 1].ObjectData[field.label] = false;
      } else {
        formData[formData.length - 1].ObjectData[field.label] = "";
      }

      field.arrAttributes.forEach((attr) => {
        const iframe = document.querySelector("iframe");
        const inputElement = getElement(
          attr,
          iframe,
          formSetting.id,
          field.label
        );

        if (inputElement) {
          switch (field.label) {
            case FormFields.IsSubmit:
              inputElement.addEventListener("click", () => {
                updateFormData(formSetting.id, field.label, true);
              });
              break;
            case FormFields.ProductName:
              inputElement.addEventListener("change", () => {
                let value;

                if (
                  inputElement.type === "checkbox" ||
                  inputElement.type === "radio"
                ) {
                  value = field.arrAttributes
                    .map((attribute) => {
                      const element = getElement(
                        attribute,
                        iframe,
                        formSetting.id,
                        field.label
                      );
                      return element && element.checked
                        ? element.dataset.value || element.value
                        : null;
                    })
                    .filter(Boolean)
                    .join(", ");
                } else {
                  value = inputElement.value;
                }
                updateFormData(formSetting.id, field.label, value);
              });
              break;
            default:
              inputElement.addEventListener("input", () => {
                let value;

                if (inputElement.type === "checkbox") {
                  value = inputElement.checked ? true : false;
                } else {
                  value = field.arrAttributes
                    .map((attribute) => {
                      const element = getElement(
                        attribute,
                        iframe,
                        formSetting.id,
                        field.label
                      );
                      return element ? element.value.trim() : "";
                    })
                    .join("");
                }
                updateFormData(formSetting.id, field.label, value);
              });
              break;
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
    selectedFormData.ObjectData[label] = inputValue;
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
    Object.assign(formInfo, {
      clientId,
      agencyId,
    });

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
    if (resData.data) {
      //if uuid is empty, save uuid to currentUuid so every call later payload have appropriate objectId by each form
      if (currentUuid && !currentUuid.uuid)
        currentUuid.uuid = resData.data.uuid;
    }
  } catch (error) {
    throw error;
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

    if (!data || !data?.dataSettings || !data?.dataSettings?.length)
      throw "Form settings not found";

    //if user not in the config url
    const configPageUrl =
      data.dataSettings[0].pageSettings.page.domain +
      data.dataSettings[0].pageSettings.pageUri;
    if (fullUrl !== configPageUrl)
      throw "Form settings not applicable to this page";

    //assign agencyId to get company name
    agencyId = data?.agencyId || null;

    return data?.dataSettings?.map((item) => ({
      id: item.id,
      settings: item.settings,
    }));
  } catch (error) {
    throw error;
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
        body: JSON.stringify({ clientId, currentUrl: fullUrl }),
      }
    );
    if (!response.ok) throw response.status;

    const { data } = await response.json();

    //if data have isConverted, remove clientId
    if (data.isConverted) {
      localStorage.removeItem("clientId");
    }
  } catch (error) {
    throw error;
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

function getElement(attribute, iframe, formSettingId, label) {
  const inputEl = iframe
    ? iframe.contentDocument.querySelector(
        "[" + attribute.attribute + '="' + attribute.attributeVal + '"]'
      )
    : document.querySelector(
        "[" + attribute.attribute + '="' + attribute.attributeVal + '"]'
      );

  //add event when user click submit button not having id attribute
  if (inputEl && label === FormFields.Phone) {
    const parentForm = inputEl.closest("form");
    if (parentForm) {
      parentForm.addEventListener("submit", () => {
        updateFormData(formSettingId, FormFields.IsSubmit, true);
      });
    }
  }

  return inputEl;
}

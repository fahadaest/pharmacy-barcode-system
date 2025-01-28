document.addEventListener("DOMContentLoaded", () => {
    const cameraDiv = document.querySelector(".camera");
    const html5QrCode = new Html5Qrcode(cameraDiv.id || "camera-div-id");
    const startButton = document.getElementById("start-scanning");
    const stopButton = document.getElementById("stop-scanning");
    const scanStatusElement = document.getElementById("scan-status");
    const medicineDetailsElement = document.getElementById("medicine-details");

    let isScanningAllowed = true;

    const config = {
        fps: 10,
        qrbox: function (viewfinderWidth, viewfinderHeight) {
            const qrboxWidth = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
            const qrboxHeight = Math.min(viewfinderWidth, viewfinderHeight) * 0.5;

            return {
                width: qrboxWidth,
                height: qrboxHeight
            };
        }
    };

    const fetchMedicinesData = async () => {
        try {
            const response = await fetch("medicines.json");
            const data = await response.json();
            return data.barcodes;
        } catch (error) {
            console.error("Error loading medicines data:", error);
            return {};
        }
    };

    const updateMedicineDetails = (medicine) => {
        const setField = (fieldId, value) => {
            const fieldElement = document.getElementById(fieldId);
            if (value) {
                fieldElement.textContent = `${fieldId.charAt(0).toUpperCase() + fieldId.slice(1)}: ${value}`;
                fieldElement.style.color = 'black';
            } else {
                fieldElement.textContent = `${fieldId.charAt(0).toUpperCase() + fieldId.slice(1)}: not found`;
                fieldElement.style.color = 'red';
            }
        };

        if (medicine) {
            setField("name", medicine.name);
            setField("strength", medicine.strength);
            setField("form", medicine.form);
            setField("interactions", medicine.interactions.length > 0 ? medicine.interactions.join(", ") : null);
            setField("bnf", medicine.BNF);
        } else {
            setField("name", "");
            setField("strength", "");
            setField("form", "");
            setField("interactions", "");
            setField("bnf", "");
        }

        medicineDetailsElement.style.display = "block";
    };


    const startScanning = () => {
        scanStatusElement.textContent = "Scanning...";
        scanStatusElement.style.color = "yellow";
        Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length) {
                const cameraId = devices[0].id;
                html5QrCode.start(
                    cameraId,
                    config,
                    async (decodedText, decodedResult) => {
                        if (!isScanningAllowed) return;
                        isScanningAllowed = false;
                        setTimeout(() => {
                            isScanningAllowed = true;
                        }, 1000);

                        const audio = new Audio('./audio/store-scanner-beep-90395.mp3');
                        audio.load();
                        audio.play().catch(err => console.error("Error playing audio:", err));

                        console.log(`Decoded Text: ${decodedText}`);

                        const medicines = await fetchMedicinesData();

                        if (medicines[decodedText]) {
                            console.log("Medicine Found:", medicines[decodedText]);
                            scanStatusElement.textContent = "Medicine Found";
                            scanStatusElement.style.color = "green";
                            updateMedicineDetails(medicines[decodedText]);
                        } else {
                            scanStatusElement.textContent = "Medicine not found";
                            scanStatusElement.style.color = "red";
                            updateMedicineDetails(null);
                        }
                    },
                    (errorMessage) => {
                        console.log(`Scan error: ${errorMessage}`);
                    }
                ).catch(err => {
                    console.error(`Error starting scanner: ${err}`);
                });
            } else {
                console.warn("No cameras found.");
            }
        }).catch(err => {
            console.error(`Error getting cameras: ${err}`);
        });
    };

    const stopScanning = () => {
        medicineDetailsElement.style.display = "none";
        scanStatusElement.textContent = "Click start scanning to start";
        scanStatusElement.style.color = "black";

        html5QrCode.stop().then(() => {
            console.log("Scanner stopped.");
        }).catch(err => {
            console.error(`Error stopping scanner: ${err}`);
        });
    };

    startButton.addEventListener("click", startScanning);
    stopButton.addEventListener("click", stopScanning);
});

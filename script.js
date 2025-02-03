document.addEventListener("DOMContentLoaded", () => {
    const cameraDiv = document.querySelector(".camera");
    const html5QrCode = new Html5Qrcode(cameraDiv.id || "camera-div-id");
    const startButton = document.getElementById("start-scanning");
    const stopButton = document.getElementById("stop-scanning");
    const scanStatusElement = document.getElementById("scan-status");
    const medicineDetailsElement = document.getElementById("medicine-details");
    const nextPatient = document.getElementById("next-patient");
    const imgElement = document.querySelector('.interaction-status-icon');

    let isScanningAllowed = true;
    let totalScanned = 0;
    let scannedMedicines = [];

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
            if (fieldId === 'name' && value) {
                fieldElement.style.fontSize = '20px';
                fieldElement.style.fontWeight = "500";
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
    };

    const updateMedicineTable = (medicine) => {
        const tableBody = document.querySelector("#medicine-detail-body");
        const newRow = document.createElement("tr");
        newRow.innerHTML = `
            <td>${tableBody.rows.length + 1}</td>
            <td>${medicine.name}</td>
            <td>${medicine.strength}</td>
            <td>${medicine.form}</td>
            <td>${medicine.interactions.length > 0 ? medicine.interactions.join(", ") : "None"}</td>
            <td>${medicine.BNF}</td>
        `;
        tableBody.appendChild(newRow);

        totalScanned++;
        document.getElementById("total-scanned").textContent = totalScanned;
    };

    const checkInteractionMatches = () => {
        console.log("Scanned medicines", scannedMedicines);

        const interactionTableBody = document.querySelector("#medicine-compare-details tbody");
        const interactionStatusHeader = document.querySelector("#medicine-compare-details thead tr:first-child th");

        if (scannedMedicines.length > 1) {
            let allInteractions = scannedMedicines.map(med => med.interactions).flat();

            let commonInteractions = [...new Set(allInteractions.filter((interaction, _, arr) =>
                arr.filter(i => i === interaction).length === scannedMedicines.length
            ))];

            let matchingMedicines = [
                {
                    interactions: commonInteractions.length > 0 ? commonInteractions : ["None"],
                    medicineNumber: commonInteractions.length > 0 ? commonInteractions.length : 0,
                }
            ];

            updateInteractionStatus(matchingMedicines);
            console.log(matchingMedicines);
        } else {
            let matchingMedicines = [
                {
                    interactions: ["None"],
                    medicineNumber: 0,
                }
            ];

            updateInteractionStatus(matchingMedicines);
            console.log(matchingMedicines);
        }
    };



    const updateInteractionStatus = (matchingMedicines) => {
        const interactionTableBody = document.querySelector("#medicine-compare-details tbody");
        const interactionStatusHeader = document.querySelector("#medicine-compare-details thead tr:first-child th");

        interactionTableBody.innerHTML = "";

        let totalMedicineNumber = matchingMedicines.reduce((sum, match) => sum + match.medicineNumber, 0);

        if (totalMedicineNumber === 0) {
            interactionStatusHeader.textContent = "Interaction Status: No Interactions";
            interactionStatusHeader.style.color = "green";
            imgElement.src = '/images/green-tick.svg';
        } else if (totalMedicineNumber >= 1) {
            interactionStatusHeader.textContent = "Interaction Status: Interaction found";
            interactionStatusHeader.style.color = "red";
            imgElement.src = '/images/red-cross.svg';
        }

        if (matchingMedicines.length === 0) {
            const noInteractionsRow = document.createElement("tr");
            noInteractionsRow.innerHTML = `<td colspan="3">None</td> <td colspan="3">None</td>`;
            interactionTableBody.appendChild(noInteractionsRow);
        } else {
            const aggregatedMatches = matchingMedicines.reduce((acc, match) => {
                acc.indexNumbers.push(match.medicineNumber);
                acc.interactions.push(match.interactions.join(", "));
                return acc;
            }, { indexNumbers: [], interactions: [] });

            const interactionRow = document.createElement("tr");
            interactionRow.innerHTML = `
                <td colspan="3">${aggregatedMatches.indexNumbers.join(", ")}</td>
                <td colspan="3">${aggregatedMatches.interactions.join(", ")}</td>
            `;
            interactionTableBody.appendChild(interactionRow);
        }
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
                        }, 2000);

                        const audio = new Audio('./audio/store-scanner-beep-90395.mp3');
                        audio.load();
                        audio.play().catch(err => console.error("Error playing audio:", err));

                        console.log(`Decoded Text: ${decodedText}`);

                        const medicines = await fetchMedicinesData();

                        if (medicines[decodedText]) {
                            scanStatusElement.textContent = "Medicine Found";
                            scanStatusElement.style.color = "black";
                            updateMedicineDetails(medicines[decodedText]);
                            updateMedicineTable(medicines[decodedText]);
                            scannedMedicines.push(medicines[decodedText]);
                            checkInteractionMatches();
                        } else {
                            scanStatusElement.textContent = "Medicine not found";
                            scanStatusElement.style.color = "red";
                            updateMedicineDetails(null);
                        }
                    },
                    (errorMessage) => {
                        // console.log(`Scan error: ${errorMessage}`);
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
    startButton.addEventListener("click", startScanning);

    const resetRecords = () => {
        scannedMedicines = [];
        totalScanned = 0;
        document.getElementById("total-scanned").textContent = totalScanned;
        document.querySelector("#medicine-detail-body").innerHTML = "";
        document.querySelector("#medicine-compare-details tbody").innerHTML = "";
        document.querySelector("#medicine-compare-details thead tr:first-child th").textContent = "Interaction Status: No Interactions";
        document.querySelector("#medicine-compare-details thead tr:first-child th").style.color = "green";
        updateMedicineDetails(null);
        scanStatusElement.textContent = "Click start scanning to start";
        scanStatusElement.style.color = "black";
        imgElement.src = '';
    };
    nextPatient.addEventListener("click", resetRecords);

    const stopScanning = () => {
        resetRecords();

        html5QrCode.stop().then(() => {
            console.log("Scanner stopped.");
        }).catch(err => {
            console.error(`Error stopping scanner: ${err}`);
        });
    };
    stopButton.addEventListener("click", stopScanning);
});

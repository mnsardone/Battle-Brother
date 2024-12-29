(function () {
  "use strict";

  // Cached DOM elements
  const dom = {
    liveTimeElement: document.getElementById("live-time"),
    factionListElement: document.getElementById("faction-list"),
    addFactionButton: document.getElementById("add-faction-button"),
    nextCommandPhaseButton: document.getElementById("next-command-phase-button"),
    undoButton: document.getElementById("undo-button"),
    redoButton: document.getElementById("redo-button"),
    toggleOptionsButton: document.getElementById("toggle-options-button"),
    optionsMenu: document.getElementById("options-menu"),
    resetAllButton: document.getElementById("reset-all-button"),
    saveDataButton: document.getElementById("save-data-button"),
    loadDataButton: document.getElementById("load-data-button"),
    exportDataButton: document.getElementById("export-data-button"),
    importDataButton: document.getElementById("import-data-button"),
    importFileInput: document.getElementById("import-file-input"),
    toggleAppearanceButton: document.getElementById("toggle-appearance-button"),
    backgroundUpload: document.getElementById("background-upload"),
    backgroundFileInput: document.getElementById("background-file-input"),
    titleColorToggle: document.getElementById("title-color-toggle"),
    togglePlayerButton: document.getElementById("toggle-player-button"),
    youtubePlayer: document.getElementById("youtube-player"),
    notificationContainer: document.getElementById("notification-container"),
    modal: document.getElementById("modal"),
    modalContent: document.getElementById("modal-content"),
    versionNumber: document.getElementById("version-number"),
    pageTitle: document.getElementById("page-title"),
    titleContainer: document.getElementById("title-container"),
    timeContainer: document.getElementById("time-container"),
    darkModeToggle: document.getElementById("dark-mode-toggle"),
    inquisitionImagesToggle: document.getElementById("inquisition-images-toggle"),
  };

  // Predefined factions with colors
  const predefinedFactions = [
    { name: "Ad Mech", color: "#FFC3C3" },
    { name: "Black Templars", color: "#D1D1E9" },
    { name: "Blood Angels", color: "#FF9999" },
    { name: "Chaos Daemons", color: "#FFC7C9" },
    { name: "Chaos Knights", color: "#D3CFE9" },
    { name: "Chaos Marines", color: "#E0D1F1" },
    { name: "Craftworlds", color: "#A3C4FF" },
    { name: "Custodes", color: "#FFEAB6" },
    { name: "Dark Angels", color: "#A4D4A5" },
    { name: "Death Guard", color: "#B8D4A6" },
    { name: "Deathwatch", color: "#4F4F4F" },
    { name: "Drukhari", color: "#D8D1EF" },
    { name: "Genestealers", color: "#D8B4E8" },
    { name: "Grey Knights", color: "#D7D7FF" },
    { name: "Harlequins", color: "#FBEFFF" },
    { name: "Imperial Fists", color: "#FFF4B1" },
    { name: "Imperial Guard", color: "#C9E5C6" },
    { name: "Imperial Knights", color: "#A3D3FF" },
    { name: "Necrons", color: "#B5D3FF" },
    { name: "Orks", color: "#C9F1D1" },
    { name: "Raven Guard", color: "#D3D3ED" },
    { name: "Salamanders", color: "#A8D9A5" },
    { name: "Sisters", color: "#E1CBE9" },
    { name: "Space Wolves", color: "#D0DDFE" },
    { name: "T'au", color: "#ADCFFF" },
    { name: "Team Blue", color: "#A3C4FF" },
    { name: "Team Red", color: "#FF9999" },
    { name: "Thousand Sons", color: "#B0CFFF" },
    { name: "Tyranids", color: "#E1C0E9" },
    { name: "Ultramarines", color: "#A3C4FF" },
    { name: "Votann", color: "#D8D8E4" },
    { name: "White Scars", color: "#F0F0F0" },
    { name: "World Eaters", color: "#FFD2D3" },
    { name: "Ynnari", color: "#FFFFF4" },
  ];

  let factionIdCounter = 0;
  let undoStack = [];
  let redoStack = [];
  const UNDO_STACK_LIMIT = 50;
  let factionHistories = {};

  const inquisitionImages = [
    "https://i.imgur.com/A4RTXAO.jpeg",
    "https://i.imgur.com/P6ffFgW.jpeg",
    "https://i.imgur.com/E3aM62V.jpeg",
    "https://i.imgur.com/sOvxYr7.jpeg",
    "https://i.imgur.com/GAkipoY.jpeg",
    "https://i.imgur.com/Fzy2xSe.jpeg",
    "https://i.imgur.com/xy9lSp4.jpeg",
    "https://i.imgur.com/6wcThhC.jpeg",
    "https://i.imgur.com/6y43Q3M.jpeg",
    "https://i.imgur.com/3xmVBVW.jpeg",
  ];

  let previousBackground = document.body.style.backgroundImage;

  const utils = {
    hexToRgba: (hex, alpha = 0.9) => {
      let c;
      if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split("");
        if (c.length === 3) {
          c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = "0x" + c.join("");
        return (
          "rgba(" +
          [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(",") +
          "," +
          alpha +
          ")"
        );
      }
      throw new Error("Bad Hex");
    },
    rgbaToHex: (rgba) => {
      const parts = rgba.replace(/rgba?\(|\s+|\)/g, "").split(",");
      const r = parseInt(parts[0], 10).toString(16).padStart(2, "0");
      const g = parseInt(parts[1], 10).toString(16).padStart(2, "0");
      const b = parseInt(parts[2], 10).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`.toUpperCase();
    },
    generateUniqueFactionId: () => `faction-${++factionIdCounter}`,
    updateTime: () => {
      const now = new Date();
      dom.liveTimeElement.textContent = now.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      requestAnimationFrame(utils.updateTime);
    },
    showNotification: (message, type = "info") => {
      const notification = document.createElement("div");
      notification.className = `notification ${type}`;
      notification.textContent = message;
      dom.notificationContainer.appendChild(notification);
      setTimeout(() => {
        notification.remove();
      }, 3000);
    },
    addUndoAction: (action) => {
      undoStack.push(action);
      if (undoStack.length > UNDO_STACK_LIMIT) {
        undoStack.shift();
      }
      handlers.updateUndoRedoButtonState();
    },
    getFactionByName: (name) => {
      return predefinedFactions.find((f) => f.name === name);
    },
    fallbackFaction: () => predefinedFactions[0], // If no match found, default to "Ad Mech"
  };

  requestAnimationFrame(utils.updateTime);

  const handlers = {
    updateUndoRedoButtonState: () => {
      dom.undoButton.disabled = undoStack.length === 0;
      dom.redoButton.disabled = redoStack.length === 0;
    },
    addFaction: () => {
      const factionSelect = document.getElementById("new-faction-select");
      const selectedFactionName = factionSelect.value;
      const factionObj =
        utils.getFactionByName(selectedFactionName) || utils.fallbackFaction();
      modals.closeModal();

      const factionId = utils.generateUniqueFactionId();
      const factionColorRgba = utils.hexToRgba(factionObj.color, 0.9);
      const factionDiv = factions.createFactionElement(
        factionId,
        factionObj.name,
        0,
        0,
        factionColorRgba
      );
      dom.factionListElement.appendChild(factionDiv);
      utils.addUndoAction({
        action: "add",
        factionId,
        name: factionObj.name,
        color: factionObj.color,
      });
      redoStack = [];
      factions.updateButtonState(factionId, "vp", 0);
      factions.updateButtonState(factionId, "cp", 0);

      factionHistories[factionId] = [];
      factions.addHistory(factionId, "faction", "Faction Added");
    },
    nextCommandPhase: () => {
      const factionsElems = document.querySelectorAll(".faction");
      factionsElems.forEach((faction) => {
        const factionId = faction.id;
        factions.changeValue(factionId, "cp", 1);
      });
      redoStack = [];
      handlers.updateUndoRedoButtonState();
    },
    undo: () => {
      const lastAction = undoStack.pop();
      if (!lastAction) {
        utils.showNotification("Nothing to undo!", "error");
        return;
      }
      redoStack.push(lastAction);

      switch (lastAction.action) {
        case "add":
          document.getElementById(lastAction.factionId).remove();
          break;
        case "remove":
          factions.restoreFaction(lastAction);
          break;
        case "change":
          factions.restoreValueChange(lastAction, true);
          break;
        case "edit":
          factions.restoreEdit(lastAction, true);
          break;
      }
      handlers.updateUndoRedoButtonState();
    },
    redo: () => {
      const lastUndoneAction = redoStack.pop();
      if (!lastUndoneAction) {
        utils.showNotification("Nothing to redo!", "error");
        return;
      }
      undoStack.push(lastUndoneAction);

      switch (lastUndoneAction.action) {
        case "add":
          factions.restoreAdd(lastUndoneAction);
          break;
        case "remove":
          document.getElementById(lastUndoneAction.factionId).remove();
          break;
        case "change":
          factions.restoreValueChange(lastUndoneAction, false);
          break;
        case "edit":
          factions.restoreEdit(lastUndoneAction, false);
          break;
      }
      handlers.updateUndoRedoButtonState();
    },
    saveData: () => {
      modals.closeModal();
      const data = {
        factions: factions.getFactionData(),
        factionHistories,
        factionOrder: Array.from(dom.factionListElement.children).map(
          (child) => child.id
        ),
      };
      localStorage.setItem("factionData", JSON.stringify(data));
      utils.showNotification("Data saved successfully!", "success");
    },
    loadData: () => {
      modals.closeModal();
      const savedData = localStorage.getItem("factionData");
      if (savedData) {
        try {
          const data = JSON.parse(savedData);
          factions.resetAll();
          factionHistories = data.factionHistories || {};
          data.factionOrder.forEach((factionId) => {
            const factionData = data.factions.find(
              (f) => f.factionId === factionId
            );
            if (factionData) {
              factions.restoreFactionData(factionData);
            }
          });
          utils.showNotification("Data loaded successfully!", "success");
        } catch (error) {
          utils.showNotification(
            "Failed to load saved data. The data might be corrupted.",
            "error"
          );
        }
      } else {
        utils.showNotification("No saved data found.", "error");
      }
      undoStack = [];
      redoStack = [];
      handlers.updateUndoRedoButtonState();
    },
    autoSaveData: () => {
      handlers.saveData();
      console.log("Data auto-saved.");
    },
    setBackground: (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        // Turn off inquisition images if on
        if (dom.inquisitionImagesToggle.checked) {
          dom.inquisitionImagesToggle.checked = false;
        }

        previousBackground = `url('${e.target.result}')`;
        document.body.style.backgroundImage = previousBackground;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";

        updateDividerLineAppearance();
      };
      reader.readAsDataURL(file);
    },
    toggleTitleAndTimeColor: () => {
      const newColor = dom.titleColorToggle.checked
        ? "var(--secondary-color)"
        : "var(--primary-color)";
      dom.pageTitle.style.color = newColor;
      dom.liveTimeElement.style.color = newColor;
      dom.versionNumber.style.color = newColor;
    },
    toggleOptionsMenu: () => {
      if (
        dom.optionsMenu.style.display === "none" ||
        dom.optionsMenu.style.display === ""
      ) {
        dom.optionsMenu.style.display = "flex";
        dom.toggleOptionsButton.classList.add("active-button");
      } else {
        dom.optionsMenu.style.display = "none";
        dom.toggleOptionsButton.classList.remove("active-button");
      }
    },
    toggleAppearanceMenu: () => {
      if (
        dom.backgroundUpload.style.display === "none" ||
        dom.backgroundUpload.style.display === ""
      ) {
        dom.backgroundUpload.style.display = "flex";
        dom.toggleAppearanceButton.classList.add("active-button");
      } else {
        dom.backgroundUpload.style.display = "none";
        dom.toggleAppearanceButton.classList.remove("active-button");
      }
    },
    toggleDarkMode: () => {
      if (dom.darkModeToggle.checked) {
        // Turn off inquisition images if on
        if (dom.inquisitionImagesToggle.checked) {
          dom.inquisitionImagesToggle.checked = false;
          document.body.style.backgroundImage = previousBackground;
        }
        document.body.classList.add("dark-mode");
      } else {
        document.body.classList.remove("dark-mode");
      }
      updateDividerLineAppearance();
    },
    toggleInquisitionImages: () => {
      if (dom.inquisitionImagesToggle.checked) {
        // Turn off dark mode if on
        if (dom.darkModeToggle.checked) {
          dom.darkModeToggle.checked = false;
          document.body.classList.remove("dark-mode");
        }
        // Store current background
        previousBackground = document.body.style.backgroundImage;
        // Choose random image
        const randomImage =
          inquisitionImages[
            Math.floor(Math.random() * inquisitionImages.length)
          ];
        document.body.style.backgroundImage = `url('${randomImage}')`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
      } else {
        // Restore previous background
        document.body.style.backgroundImage = previousBackground;
      }
      updateDividerLineAppearance();
    },
  };

  const factions = {
    createFactionElement: (factionId, name, vp, cp, color) => {
      const factionDiv = document.createElement("div");
      factionDiv.className = "faction";
      factionDiv.id = factionId;
      factionDiv.draggable = true;
      factionDiv.style.backgroundColor = color;

      factionDiv.innerHTML = `
                <span class="skull-emoji" id="skull-${factionId}">☠️</span>
                <div class="faction-title" id="faction-title-${factionId}">${name}</div>
                <div class="faction-values">
                    <div class="faction-value" id="vp-${factionId}">${vp} VP</div>
                    <div class="faction-value" id="cp-${factionId}">${cp} CP</div>
                </div>
                <div class="incrementer">
                    <input type="number" min="1" id="vp-increment-${factionId}" value="1">
                    <!-- If you want them to be full bootstrap, add .btn.btn-sm here -->
                    <button class="positive-button increment-vp-button">+ VP</button>
                    <button class="negative-button decrement-vp-button">-1 VP</button>
                </div>
                <div class="incrementer">
                    <input type="number" min="1" id="cp-increment-${factionId}" value="1">
                    <!-- Likewise, .btn.btn-sm can be added -->
                    <button class="positive-button increment-cp-button">+ CP</button>
                    <button class="negative-button decrement-cp-button">-1 CP</button>
                </div>
                <div class="latest-history" id="latest-history-${factionId}">No recent actions.</div>
                <div class="action-buttons">
                    <button class="history-button toggle-history-button" id="toggle-history-button-${factionId}">Show History</button>
                    <button class="history-button edit-faction-button">Edit Faction</button>
                    <select class="status-dropdown" id="status-dropdown-${factionId}">
                        <option value="Active" selected>Active</option>
                        <option value="Tabled">Tabled</option>
                        <option value="Delete" class="delete-option">Delete</option>
                    </select>
                </div>
                <div class="history" id="history-${factionId}">
                    <ul id="history-list-${factionId}"></ul>
                </div>
            `;

      factions.addFactionEventListeners(factionDiv, factionId);
      factions.addDragAndDropHandlers(factionDiv);

      return factionDiv;
    },
    addFactionEventListeners: (factionDiv, factionId) => {
      factionDiv.addEventListener("click", (e) => {
        if (e.target.classList.contains("increment-vp-button")) {
          const incrementValue =
            parseInt(
              document.getElementById(`vp-increment-${factionId}`).value
            ) || 1;
          factions.changeValue(factionId, "vp", incrementValue);
        } else if (e.target.classList.contains("decrement-vp-button")) {
          factions.changeValue(factionId, "vp", -1);
        } else if (e.target.classList.contains("increment-cp-button")) {
          const incrementValue =
            parseInt(
              document.getElementById(`cp-increment-${factionId}`).value
            ) || 1;
          factions.changeValue(factionId, "cp", incrementValue);
        } else if (e.target.classList.contains("decrement-cp-button")) {
          factions.changeValue(factionId, "cp", -1);
        } else if (e.target.classList.contains("toggle-history-button")) {
          factions.toggleHistory(factionId);
        } else if (e.target.classList.contains("edit-faction-button")) {
          modals.showEditFactionModal(factionId);
        }
      });

      const statusDropdown = factionDiv.querySelector(
        `#status-dropdown-${factionId}`
      );
      statusDropdown.addEventListener("change", (e) => {
        factions.handleStatusChange(factionId, e.target.value);
      });
    },
    editFaction: (id) => {
      const factionSelect = document.getElementById("edit-faction-select");
      const selectedFactionName = factionSelect.value;
      if (!selectedFactionName) {
        utils.showNotification("Please choose a faction before saving.", "error");
        return;
      }
      const factionObj =
        utils.getFactionByName(selectedFactionName) || utils.fallbackFaction();

      const factionTitleElem = document.getElementById(`faction-title-${id}`);
      const factionDiv = document.getElementById(id);
      const oldName = factionTitleElem.textContent;
      const oldFaction = utils.getFactionByName(oldName);
      const oldColor = oldFaction ? oldFaction.color : "#FFFFFF";

      const newName = factionObj.name;
      const newColor = factionObj.color;
      const oldColorHex = oldColor;
      const newColorHex = newColor;

      if (newName !== oldName || newColorHex !== oldColorHex) {
        factionTitleElem.textContent = newName;
        factionDiv.style.backgroundColor = utils.hexToRgba(newColorHex, 0.9);
        factions.addHistory(id, "faction", `Changed to ${newName}`);
        utils.addUndoAction({
          action: "edit",
          factionId: id,
          oldName,
          newName,
          oldColor: oldColorHex,
          newColor: newColorHex,
        });
        redoStack = [];
      }

      modals.closeModal();
      handlers.updateUndoRedoButtonState();
    },
    removeFaction: (factionId) => {
      modals.closeModal();
      const faction = document.getElementById(factionId);
      const vp = parseInt(
        faction.querySelector(`#vp-${factionId}`).textContent,
        10
      );
      const cp = parseInt(
        faction.querySelector(`#cp-${factionId}`).textContent,
        10
      );
      const name = faction.querySelector(".faction-title").textContent;
      const factionObj = utils.getFactionByName(name);
      const colorHex = factionObj ? factionObj.color : "#FFFFFF";
      utils.addUndoAction({
        action: "remove",
        factionId,
        vp,
        cp,
        name,
        color: colorHex,
      });
      redoStack = [];
      faction.remove();
      handlers.updateUndoRedoButtonState();
    },
    changeValue: (id, type, delta, isReverted = false) => {
      const valueElem = document.getElementById(`${type}-${id}`);
      let currentValue = parseInt(valueElem.textContent.split(" ")[0]);
      const oldValue = currentValue;
      currentValue += delta;
      if (currentValue < 0) currentValue = 0;
      valueElem.textContent = `${currentValue} ${type.toUpperCase()}`;
      utils.addUndoAction({
        action: "change",
        factionId: id,
        type,
        oldValue,
        newValue: currentValue,
      });
      redoStack = [];
      const actionType = isReverted ? "reverted" : "normal";
      factions.addHistory(id, type, delta, null, actionType);
      factions.updateButtonState(id, type, currentValue);
      handlers.updateUndoRedoButtonState();
    },
    updateButtonState: (id, type, value) => {
      const decrementButton = document.querySelector(
        `#${id} .decrement-${type}-button`
      );
      if (decrementButton) {
        if (value <= 0) {
          decrementButton.disabled = true;
          decrementButton.classList.add("disabled-button");
        } else {
          decrementButton.disabled = false;
          decrementButton.classList.remove("disabled-button");
        }
      }
    },
    addHistory: (
      id,
      type,
      message,
      customMessage = null,
      actionType = "normal"
    ) => {
      let actionDescription = "";

      if (customMessage) {
        actionDescription = customMessage;
      } else {
        if (type === "vp") {
          actionDescription =
            actionType === "reverted"
              ? "Victory Points Reverted"
              : message > 0
              ? `Gained ${message} VP`
              : `Removed ${Math.abs(message)} VP`;
        } else if (type === "cp") {
          actionDescription =
            actionType === "reverted"
              ? "Command Points Reverted"
              : message > 0
              ? `Gained ${message} CP`
              : `Spent ${Math.abs(message)} CP`;
        } else {
          actionDescription = message;
        }
      }

      const timestamp = new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      const historyEntry = `[${timestamp}] ${actionDescription}`;

      if (!factionHistories[id]) {
        factionHistories[id] = [];
      }
      factionHistories[id].push(historyEntry);

      const latestHistoryElem = document.getElementById(`latest-history-${id}`);
      latestHistoryElem.textContent = historyEntry;

      const historyList = document.getElementById(`history-list-${id}`);
      if (historyList && historyList.parentElement.style.display !== "none") {
        const li = document.createElement("li");
        li.textContent = historyEntry;
        historyList.insertBefore(li, historyList.firstChild);
      }
    },
    toggleHistory: (id) => {
      const historyDiv = document.getElementById(`history-${id}`);
      const historyButton = document.getElementById(
        `toggle-history-button-${id}`
      );
      if (
        historyDiv.style.display === "none" ||
        historyDiv.style.display === ""
      ) {
        historyDiv.style.display = "block";
        historyButton.textContent = "Hide History";
        const historyList = document.getElementById(`history-list-${id}`);
        historyList.innerHTML = "";
        if (factionHistories[id]) {
          factionHistories[id]
            .slice()
            .reverse()
            .forEach((entry) => {
              const li = document.createElement("li");
              li.textContent = entry;
              historyList.appendChild(li);
            });
        }
      } else {
        historyDiv.style.display = "none";
        historyButton.textContent = "Show History";
      }
    },
    handleStatusChange: (id, status) => {
      const skullElem = document.getElementById(`skull-${id}`);
      if (status === "Tabled") {
        skullElem.style.display = "block";
        factions.addHistory(id, "status", "Status changed to Tabled");
      } else if (status === "Active") {
        skullElem.style.display = "none";
        factions.addHistory(id, "status", "Status changed to Active");
      } else if (status === "Delete") {
        factions.addHistory(id, "status", "Status changed to Delete");
        modals.showRemoveFactionModal(id);
        const faction = document.getElementById(id);
        faction.querySelector(`#status-dropdown-${id}`).value = "Active";
      }
    },
    addDragAndDropHandlers: (factionDiv) => {
      factionDiv.addEventListener("dragstart", factions.dragStart);
      factionDiv.addEventListener("dragover", factions.dragOver);
      factionDiv.addEventListener("dragenter", factions.dragEnter);
      factionDiv.addEventListener("dragleave", factions.dragLeave);
      factionDiv.addEventListener("drop", factions.dragDrop);
      factionDiv.addEventListener("dragend", factions.dragEnd);
    },
    dragStart: (e) => {
      e.dataTransfer.setData("text/plain", e.target.id);
      e.currentTarget.classList.add("dragging");
    },
    dragOver: (e) => {
      e.preventDefault();
    },
    dragEnter: (e) => {
      e.preventDefault();
      if (e.target.classList.contains("faction")) {
        e.target.classList.add("over");
      }
    },
    dragLeave: (e) => {
      if (e.target.classList.contains("faction")) {
        e.target.classList.remove("over");
      }
    },
    dragDrop: (e) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData("text/plain");
      const targetId = e.currentTarget.id;

      if (draggedId !== targetId) {
        const draggedElement = document.getElementById(draggedId);
        const targetElement = document.getElementById(targetId);

        const draggedIndex = Array.from(dom.factionListElement.children).indexOf(
          draggedElement
        );
        const targetIndex = Array.from(dom.factionListElement.children).indexOf(
          targetElement
        );

        if (draggedIndex < targetIndex) {
          dom.factionListElement.insertBefore(
            draggedElement,
            targetElement.nextSibling
          );
        } else {
          dom.factionListElement.insertBefore(draggedElement, targetElement);
        }
      }
      e.currentTarget.classList.remove("over");
    },
    dragEnd: (e) => {
      e.currentTarget.classList.remove("dragging");
      const factionElements = document.querySelectorAll(".faction");
      factionElements.forEach((elem) => elem.classList.remove("over"));
    },
    resetAll: () => {
      dom.factionListElement.innerHTML = "";
      undoStack = [];
      redoStack = [];
      factionHistories = {};
      handlers.updateUndoRedoButtonState();
    },
    getFactionData: () => {
      return Array.from(document.querySelectorAll(".faction")).map(
        (factionDiv) => {
          const factionName =
            factionDiv.querySelector(".faction-title").textContent;
          const vp = parseInt(
            factionDiv.querySelector(`#vp-${factionDiv.id}`).textContent
          );
          const cp = parseInt(
            factionDiv.querySelector(`#cp-${factionDiv.id}`).textContent
          );
          // If factionName not found in predefined list, fallback
          const factionObj =
            utils.getFactionByName(factionName) || utils.fallbackFaction();
          return {
            factionName: factionObj.name,
            vp,
            cp,
            color: factionObj.color,
            factionId: factionDiv.id,
          };
        }
      );
    },
    restoreFactionData: (factionData) => {
      const factionObj =
        utils.getFactionByName(factionData.factionName) ||
        utils.fallbackFaction();
      const factionColorRgba = utils.hexToRgba(factionObj.color, 0.9);
      const factionDiv = factions.createFactionElement(
        factionData.factionId,
        factionObj.name,
        factionData.vp,
        factionData.cp,
        factionColorRgba
      );
      dom.factionListElement.appendChild(factionDiv);
      factions.updateButtonState(factionData.factionId, "vp", factionData.vp);
      factions.updateButtonState(factionData.factionId, "cp", factionData.cp);
    },
    restoreFaction: (action) => {
      const factionObj =
        utils.getFactionByName(action.name) || utils.fallbackFaction();
      const factionColorRgba = utils.hexToRgba(factionObj.color, 0.9);
      const factionDiv = factions.createFactionElement(
        action.factionId,
        factionObj.name,
        action.vp,
        action.cp,
        factionColorRgba
      );
      dom.factionListElement.appendChild(factionDiv);
      factions.updateButtonState(action.factionId, "vp", action.vp);
      factions.updateButtonState(action.factionId, "cp", action.cp);
    },
    restoreValueChange: (action, isUndo) => {
      const valueElem = document.getElementById(
        `${action.type}-${action.factionId}`
      );
      valueElem.textContent = `${
        isUndo ? action.oldValue : action.newValue
      } ${action.type.toUpperCase()}`;
      factions.updateButtonState(
        action.factionId,
        action.type,
        isUndo ? action.oldValue : action.newValue
      );
      factions.addHistory(action.factionId, action.type, null, null, "reverted");
    },
    restoreAdd: (action) => {
      const factionObj =
        utils.getFactionByName(action.name) || utils.fallbackFaction();
      const factionColorRgba = utils.hexToRgba(factionObj.color, 0.9);
      const factionDiv = factions.createFactionElement(
        action.factionId,
        factionObj.name,
        0,
        0,
        factionColorRgba
      );
      dom.factionListElement.appendChild(factionDiv);
      factions.updateButtonState(action.factionId, "vp", 0);
      factions.updateButtonState(action.factionId, "cp", 0);
    },
    restoreEdit: (action, isUndo) => {
      const factionDiv = document.getElementById(action.factionId);
      const factionTitleElem = factionDiv.querySelector(
        `#faction-title-${action.factionId}`
      );
      const oldName = isUndo ? action.oldName : action.newName;
      const oldFactionObj =
        utils.getFactionByName(oldName) || utils.fallbackFaction();
      factionTitleElem.textContent = oldFactionObj.name;
      factionDiv.style.backgroundColor = utils.hexToRgba(
        oldFactionObj.color,
        0.9
      );
      factions.addHistory(action.factionId, "faction", "Edit Reverted");
    },
  };

  const modals = {
    showModal: (content) => {
      dom.modalContent.innerHTML = content;
      dom.modal.style.display = "flex";
      const focusableElements = dom.modalContent.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length) {
        focusableElements[0].focus();
      } else {
        dom.modalContent.focus();
      }
      dom.modalContent.addEventListener("keydown", modals.modalKeyDownHandler);
    },
    closeModal: () => {
      dom.modal.style.display = "none";
      dom.modalContent.removeEventListener(
        "keydown",
        modals.modalKeyDownHandler
      );
    },
    modalKeyDownHandler: (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const confirmButton = dom.modalContent.querySelector(
          'button[id^="confirm"]'
        );
        if (confirmButton) {
          confirmButton.click();
        }
      } else if (event.key === "Escape") {
        modals.closeModal();
      }
    },
    showAddFactionModal: () => {
      const factionOptions = predefinedFactions
        .map((f) => `<option value="${f.name}">${f.name}</option>`)
        .join("");
      modals.showModal(`
                <h2>Add Faction</h2>
                <select id="new-faction-select">
                    <option value="" disabled selected>Choose your faction</option>
                    ${factionOptions}
                </select>
                <div>
                    <button id="confirm-add-faction-button">Add</button>
                    <button id="cancel-add-faction-button">Cancel</button>
                </div>
            `);

      document
        .getElementById("confirm-add-faction-button")
        .addEventListener("click", () => {
          const factionSelect = document.getElementById("new-faction-select");
          const selectedFactionName = factionSelect.value;
          if (!selectedFactionName) {
            utils.showNotification(
              "Please choose a faction before adding.",
              "error"
            );
            return;
          }
          handlers.addFaction();
        });
      document
        .getElementById("cancel-add-faction-button")
        .addEventListener("click", modals.closeModal);
    },
    showEditFactionModal: (id) => {
      const factionTitleElem = document.getElementById(`faction-title-${id}`);
      const currentName = factionTitleElem.textContent;
      const factionOptions = predefinedFactions
        .map(
          (f) =>
            `<option value="${f.name}" ${
              f.name === currentName ? "selected" : ""
            }>${f.name}</option>`
        )
        .join("");

      modals.showModal(`
                <h2>Edit Faction</h2>
                <select id="edit-faction-select">
                    <option value="" disabled ${
                      !utils.getFactionByName(currentName) ? "selected" : ""
                    }>Choose your faction</option>
                    ${factionOptions}
                </select>
                <div>
                    <button id="confirm-edit-faction-button">Save</button>
                    <button id="cancel-edit-faction-button">Cancel</button>
                </div>
            `);

      document
        .getElementById("confirm-edit-faction-button")
        .addEventListener("click", () => {
          const factionSelect = document.getElementById("edit-faction-select");
          const selectedFactionName = factionSelect.value;
          if (!selectedFactionName) {
            utils.showNotification(
              "Please choose a faction before saving.",
              "error"
            );
            return;
          }
          factions.editFaction(id);
        });
      document
        .getElementById("cancel-edit-faction-button")
        .addEventListener("click", modals.closeModal);
    },
    showRemoveFactionModal: (id) => {
      modals.showModal(`
                <h2>Delete Faction</h2>
                <p>Are you sure you want to delete this faction?</p>
                <div>
                    <button id="confirm-remove-faction-button" class="critical-button">Delete</button>
                    <button id="cancel-remove-faction-button">Cancel</button>
                </div>
            `);

      document
        .getElementById("confirm-remove-faction-button")
        .addEventListener("click", () => factions.removeFaction(id));
      document
        .getElementById("cancel-remove-faction-button")
        .addEventListener("click", modals.closeModal);
    },
    showConfirmResetAllModal: () => {
      modals.showModal(`
                <h2>Reset All</h2>
                <p>Are you sure you want to reset all factions?</p>
                <div>
                    <button id="confirm-reset-all-button">Yes</button>
                    <button id="cancel-reset-all-button">No</button>
                </div>
            `);

      document
        .getElementById("confirm-reset-all-button")
        .addEventListener("click", () => {
          modals.closeModal();
          factions.resetAll();
        });
      document
        .getElementById("cancel-reset-all-button")
        .addEventListener("click", modals.closeModal);
    },
    showConfirmSaveModal: () => {
      modals.showModal(`
                <h2>Save Data</h2>
                <p>Are you sure you want to save data?</p>
                <div>
                    <button id="confirm-save-button">Yes</button>
                    <button id="cancel-save-button">No</button>
                </div>
            `);

      document
        .getElementById("confirm-save-button")
        .addEventListener("click", handlers.saveData);
      document
        .getElementById("cancel-save-button")
        .addEventListener("click", modals.closeModal);
    },
    showConfirmLoadModal: () => {
      modals.showModal(`
                <h2>Load Data</h2>
                <p>Are you sure you want to load saved data? This will overwrite current data.</p>
                <div>
                    <button id="confirm-load-button">Yes</button>
                    <button id="cancel-load-button">No</button>
                </div>
            `);

      document
        .getElementById("confirm-load-button")
        .addEventListener("click", handlers.loadData);
      document
        .getElementById("cancel-load-button")
        .addEventListener("click", modals.closeModal);
    },
  };

  window.addEventListener("click", function (event) {
    if (event.target === dom.modal) {
      modals.closeModal();
    }
  });

  function updateDividerLineAppearance() {
    const divider = document.querySelector(".divider-line");
    const currentBG = document.body.style.backgroundImage;
    const hasCustomBG =
      currentBG && currentBG !== "none" && !dom.inquisitionImagesToggle.checked;

    // If inquisition images active OR custom background set: line invisible
    if (dom.inquisitionImagesToggle.checked || hasCustomBG) {
      divider.style.display = "none";
      return;
    }

    // If dark mode and no inquisition/custom background
    if (dom.darkModeToggle.checked) {
      divider.style.display = "block";
      divider.style.background = "white";
      divider.style.backgroundImage = "none";
    } else {
      // Default: match footer style
      divider.style.display = "block";
      divider.style.background =
        "rgba(222, 184, 135, 0.8) url('https://www.transparenttextures.com/patterns/old-wall.png')";
      divider.style.backgroundSize = "cover";
      divider.style.backgroundRepeat = "repeat";
    }
  }

  // Event Listeners
  dom.addFactionButton.addEventListener("click", modals.showAddFactionModal);
  dom.nextCommandPhaseButton.addEventListener("click", handlers.nextCommandPhase);
  dom.undoButton.addEventListener("click", handlers.undo);
  dom.redoButton.addEventListener("click", handlers.redo);
  dom.toggleOptionsButton.addEventListener("click", handlers.toggleOptionsMenu);
  dom.resetAllButton.addEventListener("click", modals.showConfirmResetAllModal);
  dom.saveDataButton.addEventListener("click", modals.showConfirmSaveModal);
  dom.loadDataButton.addEventListener("click", modals.showConfirmLoadModal);
  dom.exportDataButton.addEventListener("click", () => {
    const data = {
      factions: factions.getFactionData(),
      factionHistories,
      factionOrder: Array.from(dom.factionListElement.children).map(
        (child) => child.id
      ),
    };
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "factionData.json";
    a.click();
    URL.revokeObjectURL(url);
  });
  dom.importDataButton.addEventListener("click", () =>
    dom.importFileInput.click()
  );
  dom.importFileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        factions.resetAll();
        factionHistories = data.factionHistories || {};
        data.factionOrder.forEach((factionId) => {
          const factionData = data.factions.find(
            (f) => f.factionId === factionId
          );
          if (factionData) {
            factions.restoreFactionData(factionData);
          }
        });
        handlers.updateUndoRedoButtonState();
        utils.showNotification("Data imported successfully!", "success");
      } catch (error) {
        utils.showNotification(
          "Failed to import data. The file might be corrupted or in an incorrect format.",
          "error"
        );
      }
    };
    reader.readAsText(file);
  });
  dom.toggleAppearanceButton.addEventListener("click", handlers.toggleAppearanceMenu);
  dom.backgroundFileInput.addEventListener("change", handlers.setBackground);
  dom.titleColorToggle.addEventListener("change", handlers.toggleTitleAndTimeColor);
  dom.togglePlayerButton.addEventListener("click", () => {
    if (dom.youtubePlayer.style.display === "none") {
      dom.youtubePlayer.style.display = "block";
      dom.togglePlayerButton.textContent = "Hide Sound";
    } else {
      dom.youtubePlayer.style.display = "none";
      dom.togglePlayerButton.textContent = "Show Sound";
    }
  });

  dom.darkModeToggle.addEventListener("change", () => {
    handlers.toggleDarkMode();
    if (dom.darkModeToggle.checked && dom.inquisitionImagesToggle.checked) {
      dom.inquisitionImagesToggle.checked = false;
      document.body.style.backgroundImage = previousBackground;
    }
    updateDividerLineAppearance();
  });

  dom.inquisitionImagesToggle.addEventListener("change", () => {
    handlers.toggleInquisitionImages();
    if (dom.inquisitionImagesToggle.checked && dom.darkModeToggle.checked) {
      dom.darkModeToggle.checked = false;
      document.body.classList.remove("dark-mode");
    }
    updateDividerLineAppearance();
  });

  //
  // MISSION BUTTON - Toggle & highlight
  //
  const missionButton = document.getElementById("toggle-mission-button");
  const missionContainer = document.getElementById("mission-container");

  missionButton.addEventListener("click", () => {
    if (missionContainer.style.display === "none") {
      missionContainer.style.display = "block";
      missionButton.classList.add("active-button"); // NEW: highlight when active
    } else {
      missionContainer.style.display = "none";
      missionButton.classList.remove("active-button"); // remove highlight
    }
  });

  setInterval(handlers.autoSaveData, 300000);
  updateDividerLineAppearance();

  // Helper function to get the current list of faction elements
  function getFactionElements() {
    return Array.from(document.querySelectorAll(".faction"));
  }

  // Tracks which faction is currently selected (-1 means none)
  let selectedFactionIndex = -1;

  // Highlights the currently selected faction by applying a special CSS class
  function highlightFaction(index) {
    const factionElems = getFactionElements();
    // Remove highlight from all factions
    factionElems.forEach((elem) => elem.classList.remove("faction-selected"));

    // If index is valid, add highlight
    if (index >= 0 && index < factionElems.length) {
      factionElems[index].classList.add("faction-selected");
    }
  }

  document.addEventListener("keydown", (event) => {
    // 1) Hotkeys for Missions, Next Command Phase, Undo, Redo
    if (event.key === "m") {
      missionButton.click();
      return;
    }
    if (event.key === "c") {
      dom.nextCommandPhaseButton.click();
      return;
    }
    if (event.key === "u") {
      dom.undoButton.click();
      return;
    }
    if (event.key === "r") {
      dom.redoButton.click();
      return;
    }
    if (event.key === "f") {
      dom.addFactionButton.click();
      return;
    }

    // 2) Left/Right (or A/D) to move selection
    if (event.key === "ArrowLeft" || event.key === "a") {
      const factionsArr = getFactionElements();
      if (factionsArr.length > 0) {
        selectedFactionIndex = Math.max(0, selectedFactionIndex - 1);
        highlightFaction(selectedFactionIndex);
        event.preventDefault(); // prevent default scrolling
      }
      return;
    }
    if (event.key === "ArrowRight" || event.key === "d") {
      const factionsArr = getFactionElements();
      if (factionsArr.length > 0) {
        selectedFactionIndex = Math.min(
          factionsArr.length - 1,
          selectedFactionIndex + 1
        );
        highlightFaction(selectedFactionIndex);
        event.preventDefault();
      }
      return;
    }

    // 3) + / - : Increment / Decrement VP
    if ((event.key === "+" || event.key === "=") && selectedFactionIndex >= 0) {
      const factionsArr = getFactionElements();
      const selectedElem = factionsArr[selectedFactionIndex];
      factions.changeValue(selectedElem.id, "vp", 1);
      return;
    }
    if (event.key === "-" && selectedFactionIndex >= 0) {
      const factionsArr = getFactionElements();
      const selectedElem = factionsArr[selectedFactionIndex];
      factions.changeValue(selectedElem.id, "vp", -1);
      return;
    }

    // 4) [ / ] : Decrement / Increment CP
    if (event.key === "[" && selectedFactionIndex >= 0) {
      const factionsArr = getFactionElements();
      const selectedElem = factionsArr[selectedFactionIndex];
      factions.changeValue(selectedElem.id, "cp", -1);
      return;
    }
    if (event.key === "]" && selectedFactionIndex >= 0) {
      const factionsArr = getFactionElements();
      const selectedElem = factionsArr[selectedFactionIndex];
      factions.changeValue(selectedElem.id, "cp", 1);
      return;
    }
  });
  // ---- End Enhanced Keydown Listener ----
})();

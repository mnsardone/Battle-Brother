// script.js
(function () {
    'use strict';

    // Cached DOM elements
    const dom = {
        liveTimeElement: document.getElementById('live-time'),
        factionListElement: document.getElementById('faction-list'),
        addFactionButton: document.getElementById('add-faction-button'),
        nextCommandPhaseButton: document.getElementById('next-command-phase-button'),
        undoButton: document.getElementById('undo-button'),
        redoButton: document.getElementById('redo-button'),
        toggleOptionsButton: document.getElementById('toggle-options-button'),
        optionsMenu: document.getElementById('options-menu'),
        resetAllButton: document.getElementById('reset-all-button'),
        saveDataButton: document.getElementById('save-data-button'),
        loadDataButton: document.getElementById('load-data-button'),
        exportDataButton: document.getElementById('export-data-button'),
        importDataButton: document.getElementById('import-data-button'),
        importFileInput: document.getElementById('import-file-input'),
        toggleAppearanceButton: document.getElementById('toggle-appearance-button'),
        backgroundUpload: document.getElementById('background-upload'),
        backgroundFileInput: document.getElementById('background-file-input'),
        titleColorToggle: document.getElementById('title-color-toggle'),
        togglePlayerButton: document.getElementById('toggle-player-button'),
        youtubePlayer: document.querySelector('iframe'),
        notificationContainer: document.getElementById('notification-container'),
        modal: document.getElementById('modal'),
        modalContent: document.getElementById('modal-content'),
        versionNumber: document.getElementById('version-number'),
        pageTitle: document.getElementById('page-title'),
        titleContainer: document.getElementById('title-container'),
        timeContainer: document.getElementById('time-container'),
        darkModeToggle: document.getElementById('dark-mode-toggle')
    };

    const predefinedColors = [
        '#B6B3F2', '#B0EDF0', '#BAF1B4', '#FCEDA8', '#FCA9C9',
        '#F8AC8C', '#FBE4C4', '#F9F4F0', '#D2E4E8', '#DEACD1'
    ];

    let factionIdCounter = 0;
    let undoStack = [];
    let redoStack = [];
    const UNDO_STACK_LIMIT = 50;
    let factionHistories = {};

    // Utility Functions
    const utils = {
        hexToRgba: (hex, alpha = 0.90) => {
            let c;
            if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
                c = hex.substring(1).split('');
                if (c.length === 3) {
                    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
                }
                c = '0x' + c.join('');
                return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
            }
            throw new Error('Bad Hex');
        },
        rgbaToHex: (rgba) => {
            const parts = rgba.replace(/rgba?\(|\s+|\)/g, '').split(',');
            const r = parseInt(parts[0], 10).toString(16).padStart(2, '0');
            const g = parseInt(parts[1], 10).toString(16).padStart(2, '0');
            const b = parseInt(parts[2], 10).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`.toUpperCase();
        },
        generateUniqueFactionId: () => `faction-${++factionIdCounter}`,
        updateTime: () => {
            const now = new Date();
            dom.liveTimeElement.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            requestAnimationFrame(utils.updateTime);
        },
        showNotification: (message, type = 'info') => {
            const notification = document.createElement('div');
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
        }
    };

    // Start updating the time
    requestAnimationFrame(utils.updateTime);

    const handlers = {
        updateUndoRedoButtonState: () => {
            dom.undoButton.disabled = undoStack.length === 0;
            dom.redoButton.disabled = redoStack.length === 0;
        },
        addFaction: () => {
            const factionNameInput = document.getElementById('new-faction-name');
            const factionColorSelect = document.getElementById('new-faction-color');
            const factionName = factionNameInput.value.trim() || 'New Faction';
            const factionColorHex = factionColorSelect.value || '#FFFFFF';
            let factionColorRgba = '#FFFFFF';

            try {
                factionColorRgba = utils.hexToRgba(factionColorHex, 0.90);
            } catch (error) {
                utils.showNotification('Invalid color selected. Defaulting to white.', 'error');
            }

            modals.closeModal();

            const factionId = utils.generateUniqueFactionId();
            const factionDiv = factions.createFactionElement(factionId, factionName, 0, 0, factionColorRgba);
            dom.factionListElement.appendChild(factionDiv);
            utils.addUndoAction({ action: 'add', factionId, name: factionName, color: factionColorHex });
            redoStack = [];
            factions.updateButtonState(factionId, 'vp', 0);
            factions.updateButtonState(factionId, 'cp', 0);

            factionHistories[factionId] = [];
            factions.addHistory(factionId, 'faction', 'Faction Added');
        },
        nextCommandPhase: () => {
            const factionsElems = document.querySelectorAll('.faction');
            factionsElems.forEach(faction => {
                const factionId = faction.id;
                factions.changeValue(factionId, 'cp', 1);
            });
            redoStack = [];
            handlers.updateUndoRedoButtonState();
        },
        undo: () => {
            const lastAction = undoStack.pop();
            if (!lastAction) {
                utils.showNotification('Nothing to undo!', 'error');
                return;
            }

            redoStack.push(lastAction);

            switch (lastAction.action) {
                case 'add':
                    document.getElementById(lastAction.factionId).remove();
                    break;
                case 'remove':
                    factions.restoreFaction(lastAction);
                    break;
                case 'change':
                    factions.restoreValueChange(lastAction, true);
                    break;
                case 'edit':
                    factions.restoreEdit(lastAction, true);
                    break;
            }
            handlers.updateUndoRedoButtonState();
        },
        redo: () => {
            const lastUndoneAction = redoStack.pop();
            if (!lastUndoneAction) {
                utils.showNotification('Nothing to redo!', 'error');
                return;
            }

            undoStack.push(lastUndoneAction);

            switch (lastUndoneAction.action) {
                case 'add':
                    factions.restoreAdd(lastUndoneAction);
                    break;
                case 'remove':
                    document.getElementById(lastUndoneAction.factionId).remove();
                    break;
                case 'change':
                    factions.restoreValueChange(lastUndoneAction, false);
                    break;
                case 'edit':
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
                factionOrder: Array.from(dom.factionListElement.children).map(child => child.id)
            };
            localStorage.setItem('factionData', JSON.stringify(data));
            utils.showNotification('Data saved successfully!', 'success');
        },
        loadData: () => {
            modals.closeModal();
            const savedData = localStorage.getItem('factionData');
            if (savedData) {
                try {
                    const data = JSON.parse(savedData);
                    factions.resetAll();
                    factionHistories = data.factionHistories || {};
                    data.factionOrder.forEach(factionId => {
                        const factionData = data.factions.find(f => f.factionId === factionId);
                        if (factionData) {
                            factions.restoreFactionData(factionData);
                        }
                    });
                    utils.showNotification('Data loaded successfully!', 'success');
                } catch (error) {
                    utils.showNotification('Failed to load saved data. The data might be corrupted.', 'error');
                }
            } else {
                utils.showNotification('No saved data found.', 'error');
            }
            undoStack = [];
            redoStack = [];
            handlers.updateUndoRedoButtonState();
        },
        autoSaveData: () => {
            handlers.saveData();
            console.log('Data auto-saved.');
        },
        setBackground: (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (e) {
                document.body.style.backgroundImage = `url('${e.target.result}')`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundRepeat = 'no-repeat';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundAttachment = 'fixed';
            };
            reader.readAsDataURL(file);
        },
        toggleTitleAndTimeColor: () => {
            const newColor = dom.titleColorToggle.checked ? 'var(--secondary-color)' : 'var(--primary-color)';
            dom.pageTitle.style.color = newColor;
            dom.liveTimeElement.style.color = newColor;
            dom.versionNumber.style.color = newColor;
        },
        toggleOptionsMenu: () => {
            if (dom.optionsMenu.style.display === 'none' || dom.optionsMenu.style.display === '') {
                dom.optionsMenu.style.display = 'flex';
                dom.toggleOptionsButton.classList.add('active-button');
            } else {
                dom.optionsMenu.style.display = 'none';
                dom.toggleOptionsButton.classList.remove('active-button');
            }
        },
        toggleAppearanceMenu: () => {
            if (dom.backgroundUpload.style.display === 'none' || dom.backgroundUpload.style.display === '') {
                dom.backgroundUpload.style.display = 'flex';
                dom.toggleAppearanceButton.classList.add('active-button');
            } else {
                dom.backgroundUpload.style.display = 'none';
                dom.toggleAppearanceButton.classList.remove('active-button');
            }
        },
        toggleDarkMode: () => {
            if (dom.darkModeToggle.checked) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
    };

    const factions = {
        createFactionElement: (factionId, name, vp, cp, color) => {
            const factionDiv = document.createElement('div');
            factionDiv.className = 'faction';
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
                    <button class="positive-button increment-vp-button">+ VP</button>
                    <button class="negative-button decrement-vp-button">-1 VP</button>
                </div>
                <div class="incrementer">
                    <input type="number" min="1" id="cp-increment-${factionId}" value="1">
                    <button class="positive-button increment-cp-button">+ CP</button>
                    <button class="negative-button decrement-cp-button">-1 CP</button>
                </div>
                <div class="latest-history" id="latest-history-${factionId}">No recent actions.</div>
                <div class="action-buttons">
                    <select class="status-dropdown" id="status-dropdown-${factionId}">
                        <option value="Active" selected>Active</option>
                        <option value="Tabled">Tabled</option>
                        <option value="Delete" class="delete-option">Delete</option>
                    </select>
                    <button class="history-button toggle-history-button" id="toggle-history-button-${factionId}">Show History</button>
                    <button class="history-button edit-faction-button">Edit Faction</button>
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
            factionDiv.addEventListener('click', (e) => {
                if (e.target.classList.contains('increment-vp-button')) {
                    const incrementValue = parseInt(document.getElementById(`vp-increment-${factionId}`).value) || 1;
                    factions.changeValue(factionId, 'vp', incrementValue);
                } else if (e.target.classList.contains('decrement-vp-button')) {
                    factions.changeValue(factionId, 'vp', -1);
                } else if (e.target.classList.contains('increment-cp-button')) {
                    const incrementValue = parseInt(document.getElementById(`cp-increment-${factionId}`).value) || 1;
                    factions.changeValue(factionId, 'cp', incrementValue);
                } else if (e.target.classList.contains('decrement-cp-button')) {
                    factions.changeValue(factionId, 'cp', -1);
                } else if (e.target.classList.contains('toggle-history-button')) {
                    factions.toggleHistory(factionId);
                } else if (e.target.classList.contains('edit-faction-button')) {
                    modals.showEditFactionModal(factionId);
                }
            });

            const statusDropdown = factionDiv.querySelector(`#status-dropdown-${factionId}`);
            statusDropdown.addEventListener('change', (e) => {
                factions.handleStatusChange(factionId, e.target.value);
            });
        },
        editFaction: (id) => {
            const factionTitleElem = document.getElementById(`faction-title-${id}`);
            const factionDiv = document.getElementById(id);
            const factionNameInput = document.getElementById('edit-faction-name');
            const factionColorSelect = document.getElementById('edit-faction-color');
            const newName = factionNameInput.value.trim();
            const newColorHex = factionColorSelect.value || '#FFFFFF';

            const oldName = factionTitleElem.textContent;
            const oldColorRgba = factionDiv.style.backgroundColor || 'rgba(255, 255, 255, 0.90)';
            const oldColorHex = utils.rgbaToHex(oldColorRgba);

            let newColorRgba = oldColorRgba;
            if (newColorHex !== oldColorHex) {
                try {
                    newColorRgba = utils.hexToRgba(newColorHex, 0.90);
                } catch (error) {
                    utils.showNotification('Invalid color selected. Keeping the old color.', 'error');
                }
            }

            let changesMade = false;

            if (newName && newName !== oldName) {
                factionTitleElem.textContent = newName;
                factions.addHistory(id, 'faction', `Name changed from "${oldName}" to "${newName}"`);
                changesMade = true;
            }

            if (newColorRgba !== oldColorRgba) {
                factionDiv.style.backgroundColor = newColorRgba;
                factions.addHistory(id, 'color', 'Color Changed');
                changesMade = true;
            }

            if (changesMade) {
                utils.addUndoAction({ action: 'edit', factionId: id, oldName, newName: newName || oldName, oldColor: oldColorHex, newColor: newColorHex });
                redoStack = [];
            }

            modals.closeModal();
            handlers.updateUndoRedoButtonState();
        },
        removeFaction: (factionId) => {
            modals.closeModal();
            const faction = document.getElementById(factionId);
            const vp = parseInt(faction.querySelector(`#vp-${factionId}`).textContent, 10);
            const cp = parseInt(faction.querySelector(`#cp-${factionId}`).textContent, 10);
            const name = faction.querySelector('.faction-title').textContent;
            const colorRgba = faction.style.backgroundColor || 'rgba(255, 255, 255, 0.90)';
            const colorHex = utils.rgbaToHex(colorRgba);
            utils.addUndoAction({ action: 'remove', factionId, vp, cp, name, color: colorHex });
            redoStack = [];
            faction.remove();
            handlers.updateUndoRedoButtonState();
        },
        changeValue: (id, type, delta, isReverted = false) => {
            const valueElem = document.getElementById(`${type}-${id}`);
            let currentValue = parseInt(valueElem.textContent.split(' ')[0]);
            const oldValue = currentValue;
            currentValue += delta;
            if (currentValue < 0) currentValue = 0;
            valueElem.textContent = `${currentValue} ${type.toUpperCase()}`;
            utils.addUndoAction({ action: 'change', factionId: id, type, oldValue, newValue: currentValue });
            redoStack = [];
            const actionType = isReverted ? 'reverted' : 'normal';
            factions.addHistory(id, type, delta, null, actionType);
            factions.updateButtonState(id, type, currentValue);
            handlers.updateUndoRedoButtonState();
        },
        updateButtonState: (id, type, value) => {
            const decrementButton = document.querySelector(`#${id} .decrement-${type}-button`);
            if (decrementButton) {
                if (value <= 0) {
                    decrementButton.disabled = true;
                    decrementButton.classList.add('disabled-button');
                } else {
                    decrementButton.disabled = false;
                    decrementButton.classList.remove('disabled-button');
                }
            }
        },
        addHistory: (id, type, message, customMessage = null, actionType = 'normal') => {
            let actionDescription = '';

            if (customMessage) {
                actionDescription = customMessage;
            } else {
                if (type === 'vp') {
                    if (actionType === 'reverted') {
                        actionDescription = 'Victory Points Reverted';
                    } else {
                        actionDescription = message > 0 ? `Gained ${message} VP` : `Removed ${Math.abs(message)} VP`;
                    }
                } else if (type === 'cp') {
                    if (actionType === 'reverted') {
                        actionDescription = 'Command Points Reverted';
                    } else {
                        actionDescription = message > 0 ? `Gained ${message} CP` : `Spent ${Math.abs(message)} CP`;
                    }
                } else if (type === 'status') {
                    actionDescription = message;
                } else if (type === 'faction') {
                    actionDescription = message;
                } else if (type === 'color') {
                    actionDescription = message;
                }
            }

            const timestamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            const historyEntry = `[${timestamp}] ${actionDescription}`;

            if (!factionHistories[id]) {
                factionHistories[id] = [];
            }
            factionHistories[id].push(historyEntry);

            const latestHistoryElem = document.getElementById(`latest-history-${id}`);
            latestHistoryElem.textContent = historyEntry;

            const historyList = document.getElementById(`history-list-${id}`);
            if (historyList && historyList.parentElement.style.display !== 'none') {
                const li = document.createElement('li');
                li.textContent = historyEntry;
                historyList.insertBefore(li, historyList.firstChild);
            }
        },
        toggleHistory: (id) => {
            const historyDiv = document.getElementById(`history-${id}`);
            const historyButton = document.getElementById(`toggle-history-button-${id}`);
            if (historyDiv.style.display === 'none' || historyDiv.style.display === '') {
                historyDiv.style.display = 'block';
                historyButton.textContent = 'Hide History';
                const historyList = document.getElementById(`history-list-${id}`);
                historyList.innerHTML = '';
                if (factionHistories[id]) {
                    factionHistories[id].slice().reverse().forEach(entry => {
                        const li = document.createElement('li');
                        li.textContent = entry;
                        historyList.appendChild(li);
                    });
                }
            } else {
                historyDiv.style.display = 'none';
                historyButton.textContent = 'Show History';
            }
        },
        handleStatusChange: (id, status) => {
            const skullElem = document.getElementById(`skull-${id}`);
            if (status === 'Tabled') {
                skullElem.style.display = 'block';
                factions.addHistory(id, 'status', 'Status changed to Tabled');
            } else if (status === 'Active') {
                skullElem.style.display = 'none';
                factions.addHistory(id, 'status', 'Status changed to Active');
            } else if (status === 'Delete') {
                factions.addHistory(id, 'status', 'Status changed to Delete');
                modals.showRemoveFactionModal(id);
                const faction = document.getElementById(id);
                faction.querySelector(`#status-dropdown-${id}`).value = 'Active';
            }
        },
        addDragAndDropHandlers: (factionDiv) => {
            factionDiv.addEventListener('dragstart', factions.dragStart);
            factionDiv.addEventListener('dragover', factions.dragOver);
            factionDiv.addEventListener('dragenter', factions.dragEnter);
            factionDiv.addEventListener('dragleave', factions.dragLeave);
            factionDiv.addEventListener('drop', factions.dragDrop);
            factionDiv.addEventListener('dragend', factions.dragEnd);
        },
        dragStart: (e) => {
            e.dataTransfer.setData('text/plain', e.target.id);
            e.currentTarget.classList.add('dragging');
        },
        dragOver: (e) => {
            e.preventDefault();
        },
        dragEnter: (e) => {
            e.preventDefault();
            if (e.target.classList.contains('faction')) {
                e.target.classList.add('over');
            }
        },
        dragLeave: (e) => {
            if (e.target.classList.contains('faction')) {
                e.target.classList.remove('over');
            }
        },
        dragDrop: (e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            const targetId = e.currentTarget.id;

            if (draggedId !== targetId) {
                const draggedElement = document.getElementById(draggedId);
                const targetElement = document.getElementById(targetId);

                const draggedIndex = Array.from(dom.factionListElement.children).indexOf(draggedElement);
                const targetIndex = Array.from(dom.factionListElement.children).indexOf(targetElement);

                if (draggedIndex < targetIndex) {
                    dom.factionListElement.insertBefore(draggedElement, targetElement.nextSibling);
                } else {
                    dom.factionListElement.insertBefore(draggedElement, targetElement);
                }
            }
            e.currentTarget.classList.remove('over');
        },
        dragEnd: (e) => {
            e.currentTarget.classList.remove('dragging');
            const factionElements = document.querySelectorAll('.faction');
            factionElements.forEach(elem => elem.classList.remove('over'));
        },
        restoreFaction: (action) => {
            const factionColorRgba = utils.hexToRgba(action.color, 0.90);
            const factionDiv = factions.createFactionElement(action.factionId, action.name, action.vp, action.cp, factionColorRgba);
            dom.factionListElement.appendChild(factionDiv);
            factions.updateButtonState(action.factionId, 'vp', action.vp);
            factions.updateButtonState(action.factionId, 'cp', action.cp);
            factionHistories[action.factionId] = action.history || [];
            factions.addHistory(action.factionId, 'faction', 'Faction Restored');
        },
        restoreAdd: (action) => {
            const factionColorRgba = utils.hexToRgba(action.color, 0.90);
            const factionDiv = factions.createFactionElement(action.factionId, action.name, 0, 0, factionColorRgba);
            dom.factionListElement.appendChild(factionDiv);
            factions.updateButtonState(action.factionId, 'vp', 0);
            factions.updateButtonState(action.factionId, 'cp', 0);
            factionHistories[action.factionId] = [];
            factions.addHistory(action.factionId, 'faction', 'Faction Added');
        },
        restoreValueChange: (action, isUndo) => {
            const valueElem = document.getElementById(`${action.type}-${action.factionId}`);
            const value = isUndo ? action.oldValue : action.newValue;
            valueElem.textContent = `${value} ${action.type.toUpperCase()}`;
            const delta = isUndo ? action.oldValue - action.newValue : action.newValue - action.oldValue;
            const actionType = isUndo ? 'reverted' : 'normal';
            factions.addHistory(action.factionId, action.type, delta, null, actionType);
            factions.updateButtonState(action.factionId, action.type, value);
        },
        restoreEdit: (action, isUndo) => {
            const factionTitleElem = document.getElementById(`faction-title-${action.factionId}`);
            const factionDiv = document.getElementById(action.factionId);
            if (isUndo) {
                factionTitleElem.textContent = action.oldName;
                factionDiv.style.backgroundColor = utils.hexToRgba(action.oldColor, 0.90);
                factions.addHistory(action.factionId, 'color', 'Color Reverted');
                factions.addHistory(action.factionId, 'faction', `Name reverted to "${action.oldName}"`);
            } else {
                factionTitleElem.textContent = action.newName;
                factionDiv.style.backgroundColor = utils.hexToRgba(action.newColor, 0.90);
                factions.addHistory(action.factionId, 'color', 'Color Changed');
                factions.addHistory(action.factionId, 'faction', `Name changed to "${action.newName}"`);
            }
        },
        resetAll: () => {
            dom.factionListElement.innerHTML = '';
            undoStack = [];
            redoStack = [];
            factionHistories = {};
            handlers.updateUndoRedoButtonState();
        },
        getFactionData: () => {
            return Array.from(document.querySelectorAll('.faction')).map(factionDiv => {
                const factionName = factionDiv.querySelector('.faction-title').textContent;
                const vp = parseInt(factionDiv.querySelector(`#vp-${factionDiv.id}`).textContent);
                const cp = parseInt(factionDiv.querySelector(`#cp-${factionDiv.id}`).textContent);
                const color = utils.rgbaToHex(factionDiv.style.backgroundColor || 'rgba(255, 255, 255, 0.90)');
                return { factionName, vp, cp, color, factionId: factionDiv.id };
            });
        },
        restoreFactionData: (factionData) => {
            const factionColorRgba = utils.hexToRgba(factionData.color, 0.90);
            const factionDiv = factions.createFactionElement(factionData.factionId, factionData.factionName, factionData.vp, factionData.cp, factionColorRgba);
            dom.factionListElement.appendChild(factionDiv);
            factions.updateButtonState(factionData.factionId, 'vp', factionData.vp);
            factions.updateButtonState(factionData.factionId, 'cp', factionData.cp);
        }
    };

    const modals = {
        showModal: (content) => {
            dom.modalContent.innerHTML = content;
            dom.modal.style.display = 'flex';
            const focusableElements = dom.modalContent.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusableElements.length) {
                focusableElements[0].focus();
            } else {
                dom.modalContent.focus();
            }
            dom.modalContent.addEventListener('keydown', modals.modalKeyDownHandler);
        },
        closeModal: () => {
            dom.modal.style.display = 'none';
            dom.modalContent.removeEventListener('keydown', modals.modalKeyDownHandler);
        },
        modalKeyDownHandler: (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const confirmButton = dom.modalContent.querySelector('button[id^="confirm"]');
                if (confirmButton) {
                    confirmButton.click();
                }
            } else if (event.key === 'Escape') {
                modals.closeModal();
            }
        },
        showAddFactionModal: () => {
            modals.showModal(`
                <h2>Add Faction</h2>
                <input type="text" id="new-faction-name" placeholder="Faction Name">
                <select id="new-faction-color">
                    <option value="" disabled selected>Select Color</option>
                    ${predefinedColors.map(color => `
                        <option value="${color}" style="background-color: ${color}; color: #000;">${color}</option>
                    `).join('')}
                </select>
                <div>
                    <button id="confirm-add-faction-button">Add</button>
                    <button id="cancel-add-faction-button">Cancel</button>
                </div>
            `);

            document.getElementById('new-faction-name').focus();
            document.getElementById('confirm-add-faction-button').addEventListener('click', handlers.addFaction);
            document.getElementById('cancel-add-faction-button').addEventListener('click', modals.closeModal);
        },
        showEditFactionModal: (id) => {
            const factionTitleElem = document.getElementById(`faction-title-${id}`);
            const factionDiv = document.getElementById(id);
            const currentName = factionTitleElem.textContent;
            const currentColorRgba = factionDiv.style.backgroundColor || 'rgba(255, 255, 255, 0.90)';
            const currentColorHex = utils.rgbaToHex(currentColorRgba);

            modals.showModal(`
                <h2>Edit Faction</h2>
                <input type="text" id="edit-faction-name" value="${currentName}">
                <select id="edit-faction-color">
                    <option value="" disabled>Select Color</option>
                    ${predefinedColors.map(color => `
                        <option value="${color}" style="background-color: ${color}; color: #000;" ${color === currentColorHex ? 'selected' : ''}>${color}</option>
                    `).join('')}
                </select>
                <div>
                    <button id="confirm-edit-faction-button">Save</button>
                    <button id="cancel-edit-faction-button">Cancel</button>
                </div>
            `);

            document.getElementById('edit-faction-name').focus();
            document.getElementById('confirm-edit-faction-button').addEventListener('click', () => factions.editFaction(id));
            document.getElementById('cancel-edit-faction-button').addEventListener('click', modals.closeModal);
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

            document.getElementById('confirm-remove-faction-button').addEventListener('click', () => factions.removeFaction(id));
            document.getElementById('cancel-remove-faction-button').addEventListener('click', modals.closeModal);
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

            document.getElementById('confirm-reset-all-button').addEventListener('click', () => {
                modals.closeModal();
                factions.resetAll();
            });
            document.getElementById('cancel-reset-all-button').addEventListener('click', modals.closeModal);
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

            document.getElementById('confirm-save-button').addEventListener('click', handlers.saveData);
            document.getElementById('cancel-save-button').addEventListener('click', modals.closeModal);
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

            document.getElementById('confirm-load-button').addEventListener('click', handlers.loadData);
            document.getElementById('cancel-load-button').addEventListener('click', modals.closeModal);
        }
    };

    // Close modal when clicking outside content
    window.addEventListener('click', function (event) {
        if (event.target === dom.modal) {
            modals.closeModal();
        }
    });

    // Event Listeners
    dom.addFactionButton.addEventListener('click', modals.showAddFactionModal);
    dom.nextCommandPhaseButton.addEventListener('click', handlers.nextCommandPhase);
    dom.undoButton.addEventListener('click', handlers.undo);
    dom.redoButton.addEventListener('click', handlers.redo);
    dom.toggleOptionsButton.addEventListener('click', handlers.toggleOptionsMenu);
    dom.resetAllButton.addEventListener('click', modals.showConfirmResetAllModal);
    dom.saveDataButton.addEventListener('click', modals.showConfirmSaveModal);
    dom.loadDataButton.addEventListener('click', modals.showConfirmLoadModal);
    dom.exportDataButton.addEventListener('click', () => {
        const data = {
            factions: factions.getFactionData(),
            factionHistories,
            factionOrder: Array.from(dom.factionListElement.children).map(child => child.id)
        };
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'factionData.json';
        a.click();
        URL.revokeObjectURL(url);
    });
    dom.importDataButton.addEventListener('click', () => dom.importFileInput.click());
    dom.importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                factions.resetAll();
                factionHistories = data.factionHistories || {};
                data.factionOrder.forEach(factionId => {
                    const factionData = data.factions.find(f => f.factionId === factionId);
                    if (factionData) {
                        factions.restoreFactionData(factionData);
                    }
                });
                handlers.updateUndoRedoButtonState();
                utils.showNotification('Data imported successfully!', 'success');
            } catch (error) {
                utils.showNotification('Failed to import data. The file might be corrupted or in an incorrect format.', 'error');
            }
        };
        reader.readAsText(file);
    });
    dom.toggleAppearanceButton.addEventListener('click', handlers.toggleAppearanceMenu);
    dom.backgroundFileInput.addEventListener('change', handlers.setBackground);
    dom.titleColorToggle.addEventListener('change', handlers.toggleTitleAndTimeColor);
    dom.togglePlayerButton.addEventListener('click', () => {
        if (dom.youtubePlayer.style.display === 'none') {
            dom.youtubePlayer.style.display = 'block';
            dom.togglePlayerButton.style.position = 'fixed';
            dom.togglePlayerButton.style.bottom = '200px';
            dom.togglePlayerButton.textContent = 'Hide Music';
        } else {
            dom.youtubePlayer.style.display = 'none';
            dom.togglePlayerButton.style.position = 'fixed';
            dom.togglePlayerButton.style.bottom = '20px';
            dom.togglePlayerButton.textContent = 'Show Music';
        }
    });

    // Dark Mode Toggle
    dom.darkModeToggle.addEventListener('change', handlers.toggleDarkMode);

    // Auto-save data every 5 minutes
    setInterval(handlers.autoSaveData, 300000);
})();

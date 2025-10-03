/**
 * Dungeon Mini Game - JavaScript Implementation
 * Веб-версия текстовой RPG игры
 */

class DungeonGame {
    constructor() {
        this.gameState = {
            player: {
                name: 'Герой',
                hp: 20,
                maxHp: 20,
                attack: 5,
                level: 1,
                xp: 0,
                xpToNext: 100,
                class: 'Воин',
                inventory: [],
                maxInventorySlots: 8
            },
            currentLocation: 'Площадь',
            score: 0,
            world: {},
            isInBattle: false,
            currentBattle: null
        };
        
        this.commands = new Map();
        this.registerCommands();
        this.initWorld();
        this.setupUI();
    }

    /**
     * Инициализация игрового мира
     */
    initWorld() {
        // Создаем локации
        const locations = {
            'Площадь': {
                name: 'Площадь',
                description: 'Каменная площадь с фонтаном.',
                exits: { north: 'Лес' },
                items: [],
                monster: null
            },
            'Лес': {
                name: 'Лес',
                description: 'Шелест листвы и птичий щебет.',
                exits: { south: 'Площадь', east: 'Пещера' },
                items: [
                    { type: 'potion', name: 'Малое зелье', heal: 5 },
                    { type: 'key', name: 'Золотой ключ', canOpen: ['Пещера->Сокровищница', 'Сокровищница->Пещера'] }
                ],
                monster: { name: 'Волк', level: 1, hp: 8, loot: [] }
            },
            'Пещера': {
                name: 'Пещера',
                description: 'Темно и сыро.',
                exits: { west: 'Лес' }, // north будет добавлен после использования ключа
                items: [
                    { type: 'weapon', name: 'Ржавый меч', attackBonus: 2 }
                ],
                monster: { name: 'Гоблин', level: 2, hp: 12, loot: [] }
            },
            'Сокровищница': {
                name: 'Сокровищница',
                description: 'Комната полная сокровищ! Но дверь вдруг захлопнулась...',
                exits: {}, // south будет добавлено после использования ключа
                items: [
                    { type: 'potion', name: 'Большое зелье', heal: 10 },
                    { type: 'weapon', name: 'Магический меч', attackBonus: 5 }
                ],
                monster: null
            }
        };

        this.gameState.world = locations;
        this.gameState.currentLocation = 'Площадь';
    }

    /**
     * Регистрация команд игры
     */
    registerCommands() {
        // Основные команды
        this.commands.set('help', (args) => this.showHelp());
        this.commands.set('look', (args) => this.look());
        this.commands.set('move', (args) => this.move(args));
        
        // Команды инвентаря
        this.commands.set('take', (args) => this.take(args));
        this.commands.set('inventory', (args) => this.showInventory());
        this.commands.set('use', (args) => this.use(args));
        
        // Боевые команды
        this.commands.set('fight', (args) => this.fight());
        this.commands.set('examine', (args) => this.examine());
        
        // Информационные команды
        this.commands.set('whoami', (args) => this.whoami());
        this.commands.set('name', (args) => this.name(args));
        
        // Сохранения и статистика
        this.commands.set('save', (args) => this.save(args));
        this.commands.set('load', (args) => this.load(args));
        this.commands.set('scores', (args) => this.showScores());
        
        // Системные команды
        this.commands.set('about', (args) => this.showAbout());
        this.commands.set('exit', (args) => this.exit());
        
        // Веб-специфичные команды
        this.commands.set('clear', (args) => this.clearOutput());
    }

    /**
     * Настройка пользовательского интерфейса
     */
    setupUI() {
        // Обработчики событий главного меню
        document.getElementById('command-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.executeCommand();
            }
        });

        document.getElementById('execute-btn').addEventListener('click', () => {
            this.executeCommand();
        });

        this.updateUI();
        this.addOutput('=== DUNGEON MINI GAME ===');
        this.addOutput('Добро пожаловать в игру! Введите команду или используйте меню.');
        this.addOutput('Введите \'help\' для списка команд или введите ваше имя: hello мой игрок');
    }

    /**
     * Получение ASCII искусства персонажа по уровню
     */
    getCharacterArt() {
        const level = this.gameState.player.level;
        
        if (level <= 3) {
            return `     ⚔️
    /|\\
    / \\
    🔰
   /|\\` + `   Статус: НОВОБРАНЕЦ ${'⭐'.repeat(level)}
   Оружие: Базовое
   Защита: Минимальная`;
        } else if (level <= 6) {
            return `    🛡️⚔️
   /|\\🔵
   / \\
  🔱🔱
 /|\\` + `   Статус: ВОИН ${'⭐'.repeat(level)}
   Оружие: Улучшенное
   Защита: Средняя`;
        } else if (level <= 9) {
            return `   🔥⚔️🔥
  /|\\🔥⭐/\\
  / \\🔥
 🔱🔥🔱��
/|\\` + `   Статус: ВЕТЕРАН ${'⭐'.repeat(level)}
   Оружие: Эпическое
   Защита: Высокая`;
        } else {
            return `  👑🔥⚔️🔥
 /|\\🔥⭐🔥\\
 / \\🔥🔥🔥
🔥👑🔥👑🔥
/|\\🔥🔥🔥\\` + `   Статус: ЛЕГЕНДА ${'⭐'.repeat(level)}
   Оружие: Артефакт
   Защита: Максимальная`;
        }
    }

    /**
     * Получение ASCII искусства локации
     */
    getLocationArt(locationName) {
        const locationArts = {
            'Площадь': `    🏛️
   /██\\
  /████\\
 🌊💧🌊
 ════════
🚪    Н    🚪`,
            'Лес': `   🌳🌲🌳
  🌿🌿🦅🐿️🌿
 🔮🔮🍄🔮🔮
═════════════`,
            'Пещера': ` 🔦💀👹💀🔦
  ▓▓▓💎▓▓▓
 ▓▓░░░▓▓▓
═══════════`,
            'Сокровищница': `🏆💰💰💰🏆
 💎💎💎💎💎
 🔐👑👑👑🔐
═══════════════`
        };
        return locationArts[locationName] || locationArts['Площадь'];
    }

    /**
     * Получение монстра искусства
     */
    getMonsterArt(monsterName, level) {
        if (monsterName === 'Волк') {
            return `     🐺❄️
    /\\🔵\\    Уровень ${level}
   /  \\/     Легкий противник
  🌙💫🌙`;
        } else if (monsterName === 'Гоблин') {
            return `  👹🔥⚔️🔥
 🟣👹🎯👹🟣
 🔥👹👹👹🔥
💀⚔️💀⚔️💀` + `   Уровень ${level}
   Опасный противник`;
        }
    }

    /**
     * Добавление опыта и проверка повышения уровня
     */
    addXp(amount) {
        const player = this.gameState.player;
        player.xp += amount;
        
        this.addOutput(`✨ Получено опыта: ${amount} (всего: ${player.xp}/${player.xpToNext})`);
        
        // Проверяем повышение уровня
        if (player.xp >= player.xpToNext) {
            this.levelUp();
        }
        
        this.updateUI();
    }

    /**
     * Повышение уровня персонажа
     */
    levelUp() {
        const player = this.gameState.player;
        
        // Вычисляем избыточный опыт
        const excessXp = player.xp - player.xpToNext;
        
        // Повышаем уровень
        player.level++;
        player.xp = excessXp;
        
        // Увеличиваем характеристики
        const oldMaxHp = player.maxHp;
        const oldAttack = player.attack;
        
        player.maxHp += Math.floor(player.level * 3 + Math.random() * 5); // Случайное увеличение HP
        player.attack += Math.floor(player.level / 2 + Math.random() * 2); // Увеличение атаки
        
        // Лечим игрока на половину от увеличения максимального HP
        const healAmount = Math.floor((player.maxHp - oldMaxHp) / 2);
        player.hp += healAmount;
        
        // Увеличиваем следующий уровень
        player.xpToNext = Math.floor(100 * Math.pow(1.2, player.level - 1));
        
        this.showLevelUpNotification(oldMaxHp, oldAttack, player.maxHp, player.attack, healAmount);
        this.updateUI();
    }

    /**
     * Показ уведомления о повышении уровня
     */
    showLevelUpNotification(oldMaxHp, oldAttack, newMaxHp, newAttack, healAmount) {
        const notification = document.createElement('div');
        notification.className = 'level-up-notification';
        
        const player = this.gameState.player;
        const levelEffects = `
            <div class="level-effects">
                <div class="level-effect">
                    <span>HP:</span>
                    <span><span class="old-value">${oldMaxHp}</span> → <span class="new-value">${newMaxHp}</span></span>
                </div>
                <div class="level-effect">
                    <span>Атака:</span>
                    <span><span class="old-value">${oldAttack}</span> → <span class="new-value">${newAttack}</span></span>
                </div>
                <div class="level-effect">
                    <span>Исцеление:</span>
                    <span class="new-value">+${healAmount} HP</span>
                </div>
                <div class="level-effect">
                    <span>Следующий уровень:</span>
                    <span class="new-value">${player.xpToNext} опыта</span>
                </div>
            </div>
        `;
        
        notification.innerHTML = `
            🎉 УРОВЕНЬ ПОВЫШЕН! 🎉
            <br>
            ${player.name} теперь ${player.level} уровня!
            ${levelEffects}
        `;
        
        document.body.appendChild(notification);
        
        // Автоматически удаляем уведомление через 4 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);
    }

    /**
     * Выполнение команды
     */
    executeCommand() {
        const input = document.getElementById('command-input').value.trim();
        if (!input) return;

        document.getElementById('command-input').value = '';
        this.addOutput(`> ${input}`);

        const parts = input.split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        try {
            if (this.commands.has(command)) {
                this.commands.get(command)(args);
                this.gameState.score++; // Небольшой бонус за каждую команду
            } else if (command === 'hello' && args.length > 0) {
                // Специальная команда для установки имени
                const playerName = args.join(' ');
                if (playerName.length >= 2 && playerName.length <= 20) {
                    this.gameState.player.name = playerName;
                    this.addOutput(`Добро пожаловать, ${playerName}!`);
                    this.addOutput('Теперь вы можете исследовать мир. Попробуйте: look, move north');
                } else {
                    this.addOutput('Имя должно быть от 2 до 20 символов');
                }
            } else {
                this.addOutput(`❌ Неизвестная команда: ${command}`);
                this.addOutput('Введите \'help\' для списка доступных команд');
            }
        } catch (error) {
            this.addOutput(`❌ Ошибка: ${error.message}`);
        }

        this.updateUI();
    }

    /**
     * Обновление интерфейса
     */
    updateUI() {
        const player = this.gameState.player;
        const location = this.gameState.world[this.gameState.currentLocation];

        // Обновление карточки персонажа
        document.getElementById('character-class').textContent = `🗡️ ${player.class} ${player.level} уровня`;
        document.getElementById('character-art').textContent = this.getCharacterArt();

        // Обновление детальной статистики персонажа
        document.getElementById('detailed-hp').textContent = `${player.hp}/${player.maxHp}`;
        document.getElementById('detailed-attack').textContent = player.attack;
        document.getElementById('detailed-level').textContent = player.level;
        document.getElementById('detailed-xp').textContent = `${player.xp}/${player.xpToNext}`;

        // Обновление прогресс-баров
        const hpPercentage = (player.hp / player.maxHp) * 100;
        document.getElementById('hp-bar').style.width = `${hpPercentage}%`;
        
        const xpPercentage = (player.xp / player.xpToNext) * 100;
        document.getElementById('xp-bar').style.width = `${Math.min(xpPercentage, 100)}%`;

        // Обновление информации в заголовке
        document.getElementById('player-name').textContent = player.name;
        document.getElementById('player-hp').textContent = `❤️ HP: ${player.hp}/${player.maxHp}`;
        document.getElementById('player-attack').textContent = `⚔️ Атака: ${player.attack}`;
        document.getElementById('player-score').textContent = `⭐ Счет: ${this.gameState.score}`;

        // Обновление визуализации локации
        if (location) {
            document.getElementById('location-name').textContent = location.name;
            document.getElementById('location-art').textContent = this.getLocationArt(location.name);
            document.getElementById('location-description').textContent = location.description;
            
            // Добавляем анимацию при смене локации
            const locationVisual = document.getElementById('location-visual');
            locationVisual.classList.add('location-transition');
            setTimeout(() => locationVisual.classList.remove('location-transition'), 500);

            // Обновление предметов в локации
            this.updateLocationItems(location);
            
            // Обновление монстров в локации
            this.updateLocationMonster(location);

            // Обновление выходов из локации
            this.updateLocationExits(location);
        }

        // Обновление детального инвентаря
        this.updateDetailedInventory();
        
        // Обновление быстрых действий
        this.updateQuickActions();
    }

    /**
     * Обновление предметов в локации
     */
    updateLocationItems(location) {
        const container = document.getElementById('location-items-grid');
        container.innerHTML = '';

        if (location.items.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999; padding: 2rem;">Предметов нет</div>';
            return;
        }

        location.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'location-item';
            
            const iconMap = {
                weapon: '⚔️',
                potion: '🧪',
                key: '🔑'
            };
            
            itemElement.innerHTML = `
                <div class="item-icon ${item.type === 'weapon' ? 'item-weapon' : item.type === 'potion' ? 'item-potion' : 'item-key'}">
                    ${iconMap[item.type] || '📦'}
                </div>
                <div class="item-name">${item.name}</div>
                <div class="item-effect">
                    ${item.type === 'weapon' ? `+${item.attackBonus} атака` : 
                      item.type === 'potion' ? `+${item.heal} HP` : 
                      'Открывает двери'}
                </div>
            `;
            
            // Проверка на полный инвентарь
            const player = this.gameState.player;
            const isFull = player.inventory.length >= player.maxInventorySlots;
            if (isFull) {
                itemElement.classList.add('inventory-full');
            }
            
            itemElement.onclick = () => {
                if (!isFull) {
                    this.executeCommandByName('take', [item.name]);
                } else {
                    this.addOutput('❌ Инвентарь полон! Освободите слот.');
                }
            };
            
            container.appendChild(itemElement);
        });
    }

    /**
     * Обновление монстров в локации
     */
    updateLocationMonster(location) {
        const monsterDisplay = document.getElementById('monster-display');
        
        if (!location.monster) {
            monsterDisplay.classList.add('hidden');
            return;
        }

        monsterDisplay.classList.remove('hidden');
        
        const monsterHtml = `
            <div class="monster-name">${location.monster.name}</div>
            <div class="monster-art">${this.getMonsterArt(location.monster.name, location.monster.level)}</div>
            <div class="monster-stats">
                <div class="monster-stat">
                    <div class="monster-level">⭐ Уровень: ${location.monster.level}</div>
                </div>
                <div class="monster-stat">
                    <div class="monster-hp">❤️ HP: ${location.monster.hp}</div>
                </div>
            </div>
        `;
        
        monsterDisplay.innerHTML = monsterHtml;
    }

    /**
     * Обновление выходов из локации
     */
    updateLocationExits(location) {
        const exitsContainer = document.getElementById('location-exits');
        const exits = Object.keys(location.exits);
        
        if (exits.length === 0) {
            exitsContainer.innerHTML = '<div style="text-align: center; color: #999;">🚫 Выходов нет</div>';
            return;
        }
        
        const exitElements = exits.map(direction => {
            const directionNames = {
                north: { name: 'Север', arrow: '⬆️' },
                south: { name: 'Юг', arrow: '⬇️' },
                east: { name: 'Восток', arrow: '➡️' },
                west: { name: 'Запад', arrow: '⬅️' }
            };
            
            const dir = directionNames[direction];
            return `
                <button class="btn btn-small" onclick="game.executeCommandByName('move', ['${direction}'])">
                    ${dir.arrow} ${dir.name} → ${location.exits[direction]}
                </button>
            `;
        }).join('');
        
        exitsContainer.innerHTML = `
            <h4>🚪 Выходы:</h4>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
                ${exitElements}
            </div>
        `;
    }

    /**
     * Обновление детального инвентаря
     */
    updateDetailedInventory() {
        const container = document.getElementById('detailed-inventory-grid');
        const inventory = this.gameState.player.inventory;
        const maxSlots = this.gameState.player.maxInventorySlots;
        
        container.innerHTML = '';
        
        // Создаем слоты инвентаря
        for (let i = 0; i < maxSlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            
            if (i < inventory.length) {
                const item = inventory[i];
                const iconMap = {
                    weapon: '⚔️',
                    potion: '🧪',
                    key: '🔑'
                };
                
                slot.innerHTML = `
                    <div class="item-icon ${item.type === 'weapon' ? 'item-weapon' : item.type === 'potion' ? 'item-potion' : 'item-key'}">
                        ${iconMap[item.type] || '📦'}
                    </div>
                    <div class="item-name">${item.name}</div>
                    <div class="item-type">${item.type === 'weapon' ? 'Оружие' : item.type === 'potion' ? 'Зелье' : 'Ключ'}</div>
                `;
                
                slot.onclick = () => this.executeCommandByName('use', [item.name]);
            } else {
                slot.classList.add('empty');
                slot.innerHTML = '<div style="color: #666;">Пусто</div>';
            }
            
            container.appendChild(slot);
        }
    }

    /**
     * Обновление инвентаря
     */
    updateInventory() {
        const inventoryContainer = document.getElementById('inventory-items');
        const inventory = this.gameState.player.inventory;

        if (inventory.length === 0) {
            inventoryContainer.textContent = 'Пуст';
            return;
        }

        // Группировка по типу
        const grouped = {};
        inventory.forEach(item => {
            const type = item.type;
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(item);
        });

        const html = Object.keys(grouped).sort().map(type => {
            const typeNames = {
                weapon: 'Оружие',
                potion: 'Зелья',
                key: 'Ключи'
            };
            const items = grouped[type].map(item => item.name).sort().join(', ');
            return `- ${typeNames[type] || type} (${grouped[type].length}): ${items}`;
        }).join('<br>');

        inventoryContainer.innerHTML = html;
    }

    /**
     * Обновление быстрых действий
     */
    updateQuickActions() {
        const location = this.gameState.world[this.gameState.currentLocation];
        const quickActions = document.getElementById('quick-actions');

        // Кнопки движения
        const movementContainer = document.getElementById('movement-buttons');
        movementContainer.innerHTML = '';

        Object.entries(location.exits).forEach(([direction, roomName]) => {
            const button = document.createElement('button');
            const directionNames = {
                north: 'Север', south: 'Юг', east: 'Восток', west: 'Запад'
            };
            button.textContent = `➡️ ${directionNames[direction]}`;
            button.className = 'movement-btn';
            button.onclick = () => this.executeCommandByName('move', [direction]);
            movementContainer.appendChild(button);
        });

        // Кнопки предметов
        const itemContainer = document.getElementById('item-buttons');
        itemContainer.innerHTML = '';

        location.items.forEach(item => {
            const button = document.createElement('button');
            button.textContent = `🎒 Взять ${item.name}`;
            button.className = 'item-btn';
            button.onclick = () => this.executeCommandByName('take', [item.name]);
            itemContainer.appendChild(button);
        });

        // Кнопки монстров
        const monsterContainer = itemContainer.cloneNode(true);
        monsterContainer.innerHTML = '';
        monsterContainer.className = 'monster-buttons';

        if (location.monster) {
            const button = document.createElement('button');
            button.textContent = `⚔️ Сразиться с ${location.monster.name}`;
            button.className = 'monster-btn';
            button.onclick = () => this.executeCommandByName('fight', []);
            monsterContainer.appendChild(button);
        }

        // Показать быстрые действия если есть что показать
        const hasActions = movementContainer.children.length > 0 || 
                         itemContainer.children.length > 0 || 
                         monsterContainer.children.length > 0;
        
        quickActions.classList.toggle('hidden', !hasActions);
        quickActions.appendChild(monsterContainer);
    }

    /**
     * Выполнение команды по имени
     */
    executeCommandByName(commandName, args) {
        const input = document.getElementById('command-input');
        input.value = `${commandName} ${args.join(' ')}`.trim();
        this.executeCommand();
    }

    /**
     * Добавление сообщения в вывод
     */
    addOutput(message) {
        const output = document.getElementById('game-output');
        const div = document.createElement('div');
        div.className = 'game-message';
        div.textContent = message;
        output.appendChild(div);
        output.scrollTop = output.scrollHeight;
    }

    /**
     * Команды игры
     */

    showHelp() {
        const commandList = Array.from(this.commands.keys()).sort().join(', ');
        this.addOutput(`📋 Доступные команды: ${commandList}`);
        this.addOutput('Для подробного описания команд перейдите в главное меню');
    }

    look() {
        const location = this.gameState.world[this.gameState.currentLocation];
        if (!location) {
            this.addOutput('❌ Ошибка: неизвестная локация');
            return;
        }

        this.addOutput(location.name + ': ' + location.description);
        
        if (location.items.length > 0) {
            this.addOutput('🎒 Предметы: ' + location.items.map(item => item.name).join(', '));
        }
        
        if (location.monster) {
            this.addOutput(`👹 В комнате монстр: ${location.monster.name} (ур. ${location.monster.level})`);
        }
        
        if (Object.keys(location.exits).length > 0) {
            const exitNames = Object.keys(location.exits).map(dir => {
                const directionNames = {
                    north: 'север', south: 'юг', east: 'восток', west: 'запад'
                };
                return directionNames[dir];
            }).join(', ');
            this.addOutput('🚪 Выходы: ' + exitNames);
        }
    }

    move(args) {
        if (args.length === 0) {
            this.addOutput('❌ Укажите направление: move <north|south|east|west>');
            return;
        }

        const direction = args[0].toLowerCase();
        const location = this.gameState.world[this.gameState.currentLocation];

        if (!location.exits[direction]) {
            this.addOutput(`❌ Нет выхода в направлении: ${direction}`);
            return;
        }

        const newLocation = location.exits[direction];
        this.gameState.currentLocation = newLocation;
        
        this.addOutput(`➡️ Вы перешли в: ${newLocation}`);
        this.addOutput(this.gameState.world[newLocation].description);
        
        this.updateUI();
    }

    take(args) {
        if (args.length === 0) {
            this.addOutput('❌ Укажите название предмета: take <item name>');
            return;
        }

        const itemName = args.join(' ');
        const location = this.gameState.world[this.gameState.currentLocation];
        const player = this.gameState.player;
        
        // Проверяем свободные слоты в инвентаре
        if (player.inventory.length >= player.maxInventorySlots) {
            this.addOutput(`❌ Инвентарь полон! Максимум ${player.maxInventorySlots} слотов.`);
            return;
        }
        
        const itemIndex = location.items.findIndex(item => 
            item.name.toLowerCase() === itemName.toLowerCase()
        );

        if (itemIndex === -1) {
            this.addOutput(`❌ Предмет '${itemName}' не найден в комнате`);
            return;
        }

        const item = location.items.splice(itemIndex, 1)[0];
        player.inventory.push(item);
        
        this.addOutput(`✅ Взято: ${item.name} (${player.inventory.length}/${player.maxInventorySlots} слотов)`);
        this.gameState.score += 2;
        this.addXp(3); // Небольшое количество опыта за сбор предметов
        
        this.updateUI();
    }

    showInventory() {
        const inventory = this.gameState.player.inventory;

        if (inventory.length === 0) {
            this.addOutput('🎒 Инвентарь пуст');
            return;
        }

        this.addOutput('🎒 Содержимое инвентаря:');
        
        // Группировка по типу
        const grouped = {};
        inventory.forEach(item => {
            const type = item.type;
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(item);
        });

        Object.keys(grouped).sort().forEach(type => {
            const typeNames = {
                weapon: 'Оружие',
                potion: 'Зелья',
                key: 'Ключи'
            };
            const items = grouped[type].map(item => item.name).sort();
            this.addOutput(`- ${typeNames[type] || type} (${grouped[type].length}): ${items.join(', ')}`);
        });
    }

    use(args) {
        if (args.length === 0) {
            this.addOutput('❌ Укажите название предмета: use <item name>');
            return;
        }

        const itemName = args.join(' ');
        const player = this.gameState.player;
        
        const itemIndex = player.inventory.findIndex(item => 
            item.name.toLowerCase() === itemName.toLowerCase()
        );

        if (itemIndex === -1) {
            this.addOutput(`❌ Предмет '${itemName}' не найден в инвентаре`);
            return;
        }

        const item = player.inventory[itemIndex];
        this.applyItem(item);
        player.inventory.splice(itemIndex, 1);
        
        this.updateUI();
    }

    applyItem(item) {
        const player = this.gameState.player;
        
        switch (item.type) {
            case 'potion':
                const healAmount = Math.min(item.heal, player.maxHp - player.hp);
                player.hp += healAmount;
                this.addXp(5); // Небольшой опыт за использование зелья
                this.addOutput(`🧪 Выпито зелье '${item.name}': +${healAmount} HP. Текущее HP: ${player.hp}`);
                break;
                
            case 'weapon':
                player.attack += item.attackBonus;
                this.addOutput(`⚔️ Оружие '${item.name}' экипировано. Атака теперь: ${player.attack}`);
                break;
                
            case 'key':
                this.addOutput(`🔑 Вы использовали ${item.name}`);
                if (this.useKey(item)) {
                    this.gameState.score += 20;
                }
                break;
                
            default:
                this.addOutput(`❓ Неизвестный тип предмета: ${item.type}`);
        }
    }

    useKey(keyItem) {
        const current = this.gameState.world[this.gameState.currentLocation];
        let doorOpened = false;

        // Пещера -> Сокровищница
        if (current.name === 'Пещера' && keyItem.canOpen.includes('Пещера->Сокровищница')) {
            current.exits.north = 'Сокровищница';
            this.addOutput('🔑 Дверь в сокровищницу открыта!');
            doorOpened = true;
        }
        
        // Сокровищница -> Пещера
        else if (current.name === 'Сокровищница' && keyItem.canOpen.includes('Сокровищница->Пещера')) {
            current.exits.south = 'Пещера';
            this.addOutput('🔑 Дверь обратно в пещеру открыта!');
            doorOpened = true;
        }
        
        else {
            this.addOutput('🔑 Ключ звенит. Возможно, где-то есть дверь...');
        }
        
        return doorOpened;
    }

    fight() {
        const location = this.gameState.world[this.gameState.currentLocation];
        
        if (!location.monster) {
            this.addOutput('❌ В этой комнате нет монстров для боя');
            return;
        }

        this.startBattle(location.monster);
    }

    startBattle(monster) {
        this.gameState.isInBattle = true;
        this.gameState.currentBattle = monster;
        
        this.addOutput(`⚔️ Начинается бой с ${monster.name}!`);
        
        // Создаем UI для боя
        this.createBattleUI(monster);
    }

    createBattleUI(monster) {
        const output = document.getElementById('game-output');
        const battleUI = document.createElement('div');
        battleUI.className = 'battle-ui';
        battleUI.innerHTML = `
            <div class="battle-info">
                <div class="combatant">
                    <strong>${this.gameState.player.name}</strong>: HP = ${this.gameState.player.hp}, Атака = ${this.gameState.player.attack}
                </div>
                <div class="combatant">
                    <strong>${monster.name}</strong>: HP = ${monster.hp}, Уровень = ${monster.level}
                </div>
            </div>
            <div class="battle-actions">
                <button class="btn btn-primary" onclick="game.battleAction('attack')">⚔️ Атаковать</button>
                <button class="btn btn-secondary" onclick="game.battleAction('run')">🏃 Бежать</button>
            </div>
        `;
        output.appendChild(battleUI);
    }

    battleAction(action) {
        const monster = this.gameState.currentBattle;
        
        if (action === 'run') {
            this.addOutput('🏃 Вы сбежали из боя!');
            this.endBattle();
            return;
        }

        if (action === 'attack') {
            // Атака игрока
            const player = this.gameState.player;
            const playerDamage = player.attack;
            monster.hp -= playerDamage;
            
            this.addOutput(`⚔️ Вы бьёте ${monster.name} на ${playerDamage}. HP монстра: ${Math.max(0, monster.hp)}`);

            if (monster.hp <= 0) {
                this.addOutput(`🎉 Монстр ${monster.name} побежден!`);
                
                // Выпадение лута
                const location = this.gameState.world[this.gameState.currentLocation];
                if (location.items.length > 0) {
                    this.addOutput('💰 Монстр выронил предметы: ' + location.items.map(item => item.name).join(', '));
                }
                
                // Начисление опыта за победу над монстром
                const xpReward = monster.level * 15 + Math.floor(Math.random() * 10);
                this.addXp(xpReward);
                
                // Начисление очков
                this.gameState.score += monster.level * 10;
                
                location.monster = null;
                this.endBattle();
                this.updateUI();
                return;
            }

            // Атака монстра
            const monsterDamage = monster.level;
            player.hp -= monsterDamage;
            this.addOutput(`👹 Монстр отвечает на ${monsterDamage}. Ваше HP: ${Math.max(0, player.hp)}`);

            if (player.hp <= 0) {
                this.addOutput('💀 Вы погибли! Игра окончена.');
                this.gameOver();
                return;
            }
            
            this.updateBattleUI(monster);
        }
    }

    updateBattleUI(monster) {
        const battleUI = document.querySelector('.battle-ui .battle-info');
        if (battleUI) {
            battleUI.innerHTML = `
                <div class="combatant">
                    <strong>${this.gameState.player.name}</strong>: HP = ${this.gameState.player.hp}, Атака = ${this.gameState.player.attack}
                </div>
                <div class="combatant">
                    <strong>${monster.name}</strong>: HP = ${monster.hp}, Уровень = ${monster.level}
                </div>
            `;
        }
        
        this.updateUI();
    }

    endBattle() {
        this.gameState.isInBattle = false;
        this.gameState.currentBattle = null;
        
        const battleUI = document.querySelector('.battle-ui');
        if (battleUI) {
            battleUI.remove();
        }
    }

    gameOver() {
        this.addOutput('=== ИГРА ОКОНЧЕНА ===');
        this.addOutput(`Ваш финальный счет: ${this.gameState.score}`);
        // Можно добавить предложение начать новую игру
        setTimeout(() => {
            if (confirm('Начать новую игру?')) {
                this.restartGame();
            }
        }, 1000);
    }

    restartGame() {
        this.gameState.player.hp = 20;
        this.gameState.player.maxHp = 20;
        this.gameState.player.attack = 5;
        this.gameState.player.level = 1;
        this.gameState.player.xp = 0;
        this.gameState.player.xpToNext = 100;
        this.gameState.player.class = 'Воин';
        this.gameState.player.inventory = [];
        this.gameState.player.maxInventorySlots = 8;
        this.gameState.score = 0;
        this.gameState.currentLocation = 'Площадь';
        this.gameState.isInBattle = false;
        this.gameState.currentBattle = null;
        
        document.getElementById('game-output').innerHTML = '';
        this.addOutput('=== НОВАЯ ИГРА ===');
        this.updateUI();
    }

    whoami() {
        const player = this.gameState.player;
        this.addOutput(`👤 Вы: ${player.name} (${player.class})`);
        this.addOutput(`⭐ Уровень ${player.level} | 🎒 Класс: ${player.class}`);
        this.addOutput(`❤️ HP: ${player.hp}/${player.maxHp} | ⚔️ Атака: ${player.attack}`);
        this.addOutput(`✨ Опыт: ${player.xp}/${player.xpToNext}`);
        this.addOutput(`🏆 Призовые очки: ${this.gameState.score}`);
        this.addOutput(`🎒 Предметов в инвентаре: ${player.inventory.length}/${player.maxInventorySlots}`);
        
        // Показываем прогресс к следующему уровню
        const progressPercent = Math.round((player.xp / player.xpToNext) * 100);
        this.addOutput(`📈 Прогресс к ${player.level + 1} уровню: ${progressPercent}%`);
    }

    name(args) {
        if (args.length === 0) {
            this.addOutput(`📝 Текущее имя: ${this.gameState.player.name}`);
            this.addOutput('Для смены имени используйте: name <новое_имя>');
            return;
        }

        const newName = args.join(' ').trim();
        if (newName.length < 2) {
            this.addOutput('❌ Имя должно содержать минимум 2 символа');
            return;
        }
        if (newName.length > 20) {
            this.addOutput('❌ Имя слишком длинное (макс. 20 символов)');
            return;
        }

        const oldName = this.gameState.player.name;
        this.gameState.player.name = newName;
        this.addOutput(`📝 Имя изменено: ${oldName} → ${newName}`);
        this.gameState.score += 5;
        
        this.updateUI();
    }

    examine() {
        const location = this.gameState.world[this.gameState.currentLocation];
        this.addOutput(location.description);
        
        // Проверка запертых дверей
        if (location.name === 'Сокровищница') {
            if (!location.exits.south) {
                this.addOutput('🚪 Вы видите запертую дверь на юг. Нужен ключ.');
            }
        }
        
        if (location.name === 'Пещера') {
            if (!location.exits.north) {
                this.addOutput('🚪 Вы видите запертую дверь на север. Нужен ключ.');
            }
        }
    }

    showScores() {
        this.addOutput('🏆 Таблица рекордов пока недоступна в веб-версии');
        this.addOutput(`💡 Ваш текущий счет: ${this.gameState.score}`);
    }

    save(args) {
        const saveName = args.length > 0 ? args.join('_') : 'untitled';
        try {
            const saveData = {
                gameState: this.gameState,
                timestamp: new Date().toISOString(),
                version: '2.0' // Версия с системой уровней
            };
            localStorage.setItem(`dungeon_save_${saveName}`, JSON.stringify(saveData));
            this.addOutput(`✅ Игра сохранена как: ${saveName}`);
            this.addOutput(`📊 Уровень персонажа: ${this.gameState.player.level}`);
            this.addOutput(`🎯 Общий опыт: ${this.gameState.player.xp + this.gameState.player.level * 100}`);
        } catch (error) {
            this.addOutput('❌ Ошибка при сохранении: ' + error.message);
        }
    }

    load(args) {
        const saveName = args.length > 0 ? args.join('_') : 'untitled';
        try {
            const savedData = localStorage.getItem(`dungeon_save_${saveName}`);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                this.gameState = parsed.gameState;
                this.addOutput(`✅ Игра загружена из: ${saveName}`);
                this.addOutput('Текущее состояние:');
                this.look();
                this.updateUI();
            } else {
                this.addOutput(`❌ Не удалось загрузить сохранение: ${saveName}`);
            }
        } catch (error) {
            this.addOutput('❌ Ошибка при загрузке: ' + error.message);
        }
    }

    showAbout() {
        this.addOutput('╔══════════════════════════════════╗');
        this.addOutput('║           DUNGEON MINI           ║');
        this.addOutput('║        Веб-версия RPG игры       ║');
        this.addOutput('╚══════════════════════════════════╝');
        this.addOutput('');
        this.addOutput('📖 ОПИСАНИЕ:');
        this.addOutput('   Исследуйте волшебный мир, сражайтесь с монстрами,');
        this.addOutput('   собирайте предметы и находите выход!');
        this.addOutput('');
        this.addOutput('⚙️  ТЕХНИЧЕСКАЯ ИНФОРМАЦИЯ:');
        this.addOutput('   Версия: JavaScript Web Application');
        this.addOutput('   Архитектура: Объектно-ориентированный JavaScript');
        this.addOutput('   Сохранения: LocalStorage браузера');
        this.addOutput('');
        this.addOutput('📞 Для справки используйте \'help\'');
    }

    exit() {
        this.addOutput('👋 Прощайте!');
        setTimeout(() => {
            if (confirm('Сохранить игру перед выходом?')) {
                this.save(['manual_exit']);
            }
        }, 500);
    }

    clearOutput() {
        document.getElementById('game-output').innerHTML = '';
        this.addOutput('Вывод очищен.');
    }
}

/**
 * UI функциональность для главного меню
 */
function showCommands() {
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('game-section').className = 'game-section hidden';
    document.getElementById('commands-section').classList.remove('hidden');
    document.getElementById('about-section').className = 'about-section hidden';
}

function hideCommands() {
    document.getElementById('commands-section').className = 'commands-section hidden';
}

function showAbout() {
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('game-section').className = 'game-section hidden';
    document.getElementById('commands-section').className = 'commands-section hidden';
    document.getElementById('about-section').classList.remove('hidden');
}

function hideAbout() {
    document.getElementById('about-section').className = 'about-section hidden';
}

function startGame() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-section').className = 'game-section';
    document.getElementById('commands-section').className = 'commands-section hidden';
    document.getElementById('about-section').className = 'about-section hidden';
    
    // Запускаем игру если еще не запущена
    if (!window.game) {
        window.game = new DungeonGame();
    }
}

function backToMenu() {
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('game-section').className = 'game-section hidden';
}

function showGameCommands() {
    showCommands();
    setTimeout(() => startGame(), 100);
}

function executeQuickCommand(command) {
    if (window.game) {
        window.game.executeCommandByName(command, []);
    }
}

// Запуск игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dungeon Mini Game загружена!');
});

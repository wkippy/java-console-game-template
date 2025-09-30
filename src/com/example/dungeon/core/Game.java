package com.example.dungeon.core;

import com.example.dungeon.model.*;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.util.*;
import java.util.stream.Collectors;


public class Game {
    private final GameState state = new GameState();
    private final Map<String, Command> commands = new LinkedHashMap<>();

    static {
        WorldInfo.touch("Game");
    }


    public Game() {
        registerCommands();
        bootstrapWorld();
    }

    // метод для генерации случайных имен
    private String generateRandomName() {
        String[] prefixes = {"Храбрый", "Мудрый", "Сильный", "Ловкий", "Великий", "Славный", "Быстрый", "Отважный"};
        String[] suffixes = {"воин", "маг", "лучник", "разведчик", "странник", "защитник", "искатель", "охотник"};

        Random random = new Random();
        String prefix = prefixes[random.nextInt(prefixes.length)];
        String suffix = suffixes[random.nextInt(suffixes.length)];

        return prefix + " " + suffix;
    }

    private void registerCommands() {
        commands.put("help", (ctx, a) -> System.out.println("Команды: " + String.join(", ", commands.keySet())));

        commands.put("name", (ctx, a) -> {
            if (a.isEmpty()) {
                System.out.println("Текущее имя: " + ctx.getPlayer().getName());
                System.out.println("Для смены имени используйте: name <новое_имя>");
                return;
            }

            String newName = String.join(" ", a).trim();
            if (newName.length() < 2) {
                throw new InvalidCommandException("Имя должно содержать минимум 2 символа");
            }
            if (newName.length() > 20) {
                throw new InvalidCommandException("Имя слишком длинное (макс. 20 символов)");
            }

            String oldName = ctx.getPlayer().getName();
            ctx.getPlayer().setName(newName);
            System.out.println("Имя изменено: " + oldName + " → " + newName);
            ctx.addScore(5); // Небольшой бонус за смену имени
        });

// команда whoami - информация об игроке
        commands.put("whoami", (ctx, a) -> {
            Player player = ctx.getPlayer();
            System.out.println("Вы: " + player.getName());
            System.out.println("HP: " + player.getHp() + ", Атака: " + player.getAttack());
            System.out.println("Счет: " + ctx.getScore());
            System.out.println("Предметов в инвентаре: " + player.getInventory().size());
        });

        commands.put("gc-stats", (ctx, a) -> {
            Runtime rt = Runtime.getRuntime();
            long max = rt.maxMemory() / 1024 / 1024;       // Максимальная память JVM
            long total = rt.totalMemory() / 1024 / 1024;   // Выделенная память
            long free = rt.freeMemory() / 1024 / 1024;     // Свободная память
            long used = total - free;                      // Используемая память

            System.out.println("=== Статистика памяти ===");
            System.out.println("Использовано: " + used + " MB");
            System.out.println("Свободно: " + free + " MB");
            System.out.println("Всего в JVM: " + total + " MB");
            System.out.println("Максимум JVM: " + max + " MB");
            System.out.println("Использование: " + (used * 100 / total) + "%");
        });

        commands.put("look", (ctx, a) -> System.out.println(ctx.getCurrent().describe()));

        commands.put("move", (ctx, a) -> {
            if (a.isEmpty()) {
                throw new InvalidCommandException("Укажите направление: move <north|south|east|west>");
            }

            String direction = a.getFirst().toLowerCase(Locale.ROOT);
            Room current = ctx.getCurrent();
            Room next = current.getNeighbors().get(direction);

            if (next == null) {
                throw new InvalidCommandException("Нет выхода в направлении: " + direction);
            }
            ctx.setCurrent(next);
            System.out.println("Вы перешли в: " + next.getName());
            System.out.println(next.describe());
        });

        commands.put("take", (ctx, a) -> {
            if (a.isEmpty()) {
                throw new InvalidCommandException("Укажите название предмета: take <item name>");
            }

            String itemName = String.join(" ", a);
            Room current = ctx.getCurrent();
            Player player = ctx.getPlayer();

            Optional<Item> foundItem = current.getItems().stream()
                    .filter(item -> item.getName().equalsIgnoreCase(itemName))
                    .findFirst();

            if (foundItem.isEmpty()) {
                throw new InvalidCommandException("Предмет '" + itemName + "' не найден в комнате");
            }

            Item item = foundItem.get();
            current.getItems().remove(item);
            player.getInventory().add(item);
            System.out.println("Взято: " + item.getName());
        });

        commands.put("inventory", (ctx, a) -> {
            Player player = ctx.getPlayer();

            if (player.getInventory().isEmpty()) {
                System.out.println("Инвентарь пуст");
                return;
            }

            // Группировка по типу предмета
            Map<String, List<Item>> groupedItems = player.getInventory().stream()
                    .collect(Collectors.groupingBy(item -> item.getClass().getSimpleName()));

            // Сортировка по названию типа и вывод
            groupedItems.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .forEach(entry -> {
                        String type = entry.getKey();
                        List<Item> items = entry.getValue();
                        // Сортировка предметов по имени
                        List<String> sortedItemNames = items.stream()
                                .map(Item::getName)
                                .sorted()
                                .toList();
                        System.out.println("- " + type + " (" + items.size() + "): " +
                                String.join(", ", sortedItemNames));
                    });
        });

        commands.put("use", (ctx, a) -> {
            if (a.isEmpty()) {
                throw new InvalidCommandException("Укажите название предмета: use <item name>");
            }

            String itemName = String.join(" ", a);
            Player player = ctx.getPlayer();

            Optional<Item> foundItem = player.getInventory().stream()
                    .filter(item -> item.getName().equalsIgnoreCase(itemName))
                    .findFirst();

            if (foundItem.isEmpty()) {
                throw new InvalidCommandException("Предмет '" + itemName + "' не найден в инвентаре");
            }

            Item item = foundItem.get();
            item.apply(ctx); // Полиморфизм через метод apply()
        });

        commands.put("fight", (ctx, a) -> {
            Room current = ctx.getCurrent();
            if (current == null) {
                throw new InvalidCommandException("Вы находитесь в неопределенной локации");
            }
            Player player = ctx.getPlayer();
            Monster monster = current.getMonster();

            if (monster == null) {
                throw new InvalidCommandException("В этой комнате нет монстров для боя");
            }

            System.out.println("Начинается бой с " + monster.getName() + "!");

            BufferedReader in = new BufferedReader(new InputStreamReader(System.in));

            try {
                while (player.getHp() > 0 && monster.getHp() > 0) {
                    System.out.println("\n--- Ход боя ---");
                    System.out.println(player.getName() + ": HP=" + player.getHp() + ", Атака=" + player.getAttack());
                    System.out.println(monster.getName() + ": HP=" + monster.getHp() + ", Уровень=" + monster.getLevel());
                    System.out.print("Введите 'attack' для атаки или 'run' для бегства: ");

                    String input = in.readLine().trim().toLowerCase(Locale.ROOT);

                    if ("run".equals(input)) {
                        System.out.println("Вы сбежали из боя!");
                        return;
                    } else if (!"attack".equals(input)) {
                        System.out.println("Неверная команда, пропуск хода");
                        continue;
                    }

                    // Атака игрока
                    int playerDamage = player.getAttack();
                    monster.setHp(monster.getHp() - playerDamage);
                    System.out.println("Вы бьёте " + monster.getName() + " на " + playerDamage +
                            ". HP монстра: " + Math.max(0, monster.getHp()));

                    if (monster.getHp() <= 0) {
                        System.out.println("Монстр побежден!");

                        // Выпадение лута
                        if (!current.getItems().isEmpty()) {
                            System.out.println("Монстр выронил предметы: " +
                                    current.getItems().stream().map(Item::getName).collect(Collectors.joining(", ")));
                        }

                        current.setMonster(null);
                        ctx.addScore(10); // Бонус за победу
                        return;
                    }

                    // Атака монстра (простая логика: уровень монстра = урон)
                    int monsterDamage = monster.getLevel();
                    player.setHp(player.getHp() - monsterDamage);
                    System.out.println("Монстр отвечает на " + monsterDamage +
                            ". Ваше HP: " + Math.max(0, player.getHp()));

                    if (player.getHp() <= 0) {
                        System.out.println("Вы погибли! Игра окончена.");
                        System.exit(0);
                    }
                }
            } catch (IOException e) {
                throw new InvalidCommandException("Ошибка ввода во время боя: " + e.getMessage());
            }
        });

        commands.put("examine", (ctx, a) -> {
            Room current = ctx.getCurrent();
            System.out.println(current.describe());

            if (current.getName().equals("Сокровищница")) {
                Room cave = ctx.getWorld().get("Пещера");
                if (cave != null && !current.getNeighbors().containsValue(cave)) {
                    System.out.println("🚪 Вы видите запертую дверь на юг. Нужен ключ.");
                }
            }

            if (current.getName().equals("Пещера")) {
                Room treasure = ctx.getWorld().get("Сокровищница");
                if (treasure != null && !current.getNeighbors().containsValue(treasure)) {
                    System.out.println("🚪 Вы видите запертую дверь на север. Нужен ключ.");
                }
            }
        });

        commands.put("save", (ctx, a) -> {
            if (a.isEmpty()) {
                SaveLoad.displaySavedGames();
                System.out.println("Для сохранения используйте: save <имя_сохранения>");
                return;
            }

            String saveName = String.join("_", a);

            try {
                // Сохраняем игру
                SaveLoad.saveGame(ctx, saveName);
                System.out.println("✓ Игра успешно сохранена");

                // Отдельно сохраняем счет (если ошибка - только предупреждение)
                try {
                    SaveLoad.saveScore(ctx.getPlayer().getName(), ctx.getScore());
                    System.out.println("✓ Счет добавлен в таблицу лидеров");
                } catch (Exception e) {
                    System.out.println("⚠ Счет не сохранен: " + e.getMessage());
                }

            } catch (Exception e) {
                System.out.println("❌ Ошибка при сохранении игры: " + e.getMessage());
            }
        });

        commands.put("load", (ctx, a) -> {
            if (a.isEmpty()) {
                SaveLoad.displaySavedGames();
                System.out.println("Для загрузки используйте: load <имя_сохранения>");
                return;
            }

            String saveName = String.join("_", a);

            try {
                if (SaveLoad.loadGame(ctx, saveName)) {
                    System.out.println("✓ Игра успешно загружена из: " + saveName);
                    System.out.println("Текущее состояние:");
                    System.out.println(ctx.getCurrent().describe());
                } else {
                    System.out.println("❌ Не удалось загрузить сохранение: " + saveName);
                }
            } catch (Exception e) {
                System.out.println("❌ Ошибка при загрузке: " + e.getMessage());
            }
        });

        commands.put("saves", (ctx, a) -> SaveLoad.displaySavedGames());
        commands.put("scores", (ctx, a) -> SaveLoad.printScores());
        commands.put("mystats", (ctx, a) -> {
            String playerName = ctx.getPlayer().getName();

            if (!Files.exists(SaveLoad.getScoresFile())) {
                System.out.println("Нет данных о ваших результатах.");
                return;
            }

            try (BufferedReader r = Files.newBufferedReader(SaveLoad.getScoresFile())) {
                int bestScore = 0;
                int totalGames = 0;
                String firstGame = null;
                String lastGame = null;

                String line;
                while ((line = r.readLine()) != null) {
                    if (line.startsWith("timestamp")) continue;

                    String[] parts = line.split(",");
                    if (parts.length >= 3 && parts[1].equals(playerName)) {
                        int score = Integer.parseInt(parts[2]);
                        bestScore = Math.max(bestScore, score);
                        totalGames++;

                        if (firstGame == null) firstGame = parts[0];
                        lastGame = parts[0];
                    }
                }

                if (totalGames > 0) {
                    System.out.println("=== ВАША СТАТИСТИКА ===");
                    System.out.println("Игрок: " + playerName);
                    System.out.println("Лучший счет: " + bestScore);
                    System.out.println("Всего игр: " + totalGames);
                    System.out.println("Первая игра: " + (firstGame != null ? firstGame.substring(0, 10) : "неизвестно"));
                    System.out.println("Последняя игра: " + (lastGame != null ? lastGame.substring(0, 10) : "неизвестно"));
                    System.out.println("=====================");
                } else {
                    System.out.println("Нет данных о ваших играх.");
                }

            } catch (IOException e) {
                System.err.println("Ошибка чтения статистики: " + e.getMessage());
            }
        });

        commands.put("exit", (ctx, a) -> {
            // сохраняем игру по желанию игрока. ниже аварийное сохранение на случай краша
            if (a.contains("save") || a.contains("сохранить")) {
                try {
                    SaveLoad.saveGame(ctx, "manual_exit");
                    System.out.println("💾 Игра сохранена перед выходом");
                } catch (Exception e) {
                    System.out.println("⚠ Не удалось сохранить игру: " + e.getMessage());
                }
            }
            System.out.println("👋 Пока!");
            System.exit(0);
        });

        commands.put("about", (ctx, a) -> {
            System.out.println("╔══════════════════════════════════╗");
            System.out.println("║           DUNGEON MINI           ║");
            System.out.println("║        Текстовая RPG игра        ║");
            System.out.println("╚══════════════════════════════════╝");
            System.out.println();
            System.out.println("📖 ОПИСАНИЕ:");
            System.out.println("   Исследуйте волшебный мир, сражайтесь с монстрами,");
            System.out.println("   собирайте предметы и находите выход!");
            System.out.println();
            System.out.println(" ОСНОВНЫЕ КОМАНДЫ:");
            System.out.println("   look       - осмотреться в комнате");
            System.out.println("   move       - переместиться (north/south/east/west)");
            System.out.println("   take       - взять предмет");
            System.out.println("   inventory  - показать инвентарь");
            System.out.println("   use        - использовать предмет");
            System.out.println("   fight      - сразиться с монстром");
            System.out.println("   examine    - осмотреть дверь");
            System.out.println("   save/load  - сохранить/загрузить игру");
            System.out.println("   saves      - доступные сохранения");
            System.out.println("   scores     - таблица лидеров");
            System.out.println("   name       - имя текущего игрока");
            System.out.println("   whoami     - информация об игроке");
            System.out.println("   mystats    - статистика игрока");
            System.out.println("   about      - об игре");
            System.out.println("   gc-stats   - память");
            System.out.println();
            System.out.println("⚙️  ТЕХНИЧЕСКАЯ ИНФОРМАЦИЯ:");
            System.out.println("   Разработка: Java Console Application");
            System.out.println("   Архитектура: Модель-Команда-Состояние");
            System.out.println("   Сохранение: Try-with-resources + NIO");
            System.out.println("   Память: " + Runtime.getRuntime().maxMemory() / 1024 / 1024 + " MB доступно");
            System.out.println();
            System.out.println("📞 Для справки используйте 'help'");
            System.out.println("🚪 Для выхода из игры используйте 'exit'");
        });
    }

    private void bootstrapWorld() {
        Player hero = new Player("Герой", 20, 5);
        state.setPlayer(hero);

        Room square = new Room("Площадь", "Каменная площадь с фонтаном.");
        Room forest = new Room("Лес", "Шелест листвы и птичий щебет.");
        Room cave = new Room("Пещера", "Темно и сыро.");
        Room treasure = new Room("Сокровищница", "Комната полная сокровищ! Но дверь вдруг захлопнулась...");

        square.getNeighbors().put("north", forest);
        forest.getNeighbors().put("south", square);
        forest.getNeighbors().put("east", cave);
        cave.getNeighbors().put("west", forest);
        cave.getNeighbors().put("north", treasure); // новое + ключ нужен
        //treasure.getNeighbors().put("south", cave);// выход из сокровищницы

        forest.getItems().add(new Potion("Малое зелье", 5));
        forest.getItems().add(new Key("Золотой ключ")); // NEW
        forest.setMonster(new Monster("Волк", 1, 8));

        cave.getItems().add(new Weapon("Ржавый меч", 2));
        cave.setMonster(new Monster("Гоблин", 2, 12));

        // Сохраняем все комнаты в мире
        Map<String, Room> world = new HashMap<>();
        world.put("Площадь", square);
        world.put("Лес", forest);
        world.put("Пещера", cave);
        world.put("Сокровищница", treasure);
        state.setWorld(world);

        state.setCurrent(square);
    }

    public void run() {
        System.out.println("=== DUNGEON MINI GAME ===");

        try (BufferedReader in = new BufferedReader(new InputStreamReader(System.in))) {

            // Запрос имени
            System.out.print("Введите имя вашего героя (или нажмите Enter для случайного): ");
            String playerName = in.readLine().trim();

            if (playerName.isEmpty()) {
                playerName = generateRandomName();
                System.out.println("Сгенерировано случайное имя: " + playerName);
            } else if (playerName.length() > 20) {
                playerName = playerName.substring(0, 20);
                System.out.println("Имя урезано до: " + playerName);
            }

            state.getPlayer().setName(playerName);
            System.out.println("Добро пожаловать, " + playerName + "!");
            System.out.println("'help' — список команд");
            System.out.println("======================");

            while (true) {
                System.out.print("> ");
                String line = in.readLine();
                if (line == null) break;
                line = line.trim();
                if (line.isEmpty()) continue;
                List<String> parts = Arrays.asList(line.split("\s+"));
                String cmd = parts.getFirst().toLowerCase(Locale.ROOT);
                List<String> args = parts.subList(1, parts.size());
                Command c = commands.get(cmd);
                try {
                    if (c == null) throw new InvalidCommandException("Неизвестная команда: " + cmd);
                    c.execute(state, args);
                    state.addScore(1);
                } catch (InvalidCommandException e) {
                    System.out.println("Ошибка: " + e.getMessage());
                } catch (Exception e) {
                    System.out.println("Непредвиденная ошибка: " + e.getClass().getSimpleName() + ": " + e.getMessage());
                }
            }

        } catch (IOException e) {
            System.out.println("Ошибка ввода/вывода: " + e.getMessage());
        } finally {// аварийное сохранение
            try {
                SaveLoad.saveGame(state, "crash_recovery");
                System.out.println("⚠ Создано аварийное сохранение");
            } catch (Exception e) {
                System.out.println("❌ Не удалось создать аварийное сохранение");
            }
        }
    }
}

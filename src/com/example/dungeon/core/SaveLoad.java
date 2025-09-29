package com.example.dungeon.core;

import com.example.dungeon.model.*;
import com.example.dungeon.core.InvalidCommandException; // Добавьте этот импорт

import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.FileTime;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

public class SaveLoad {

    private static final Path SAVE_DIR = Paths.get("saves");
    private static final Path SCORES_FILE = Paths.get("scores.csv").toAbsolutePath();

    public static Path getScoresFile() {
        return SCORES_FILE;
    }

    public static void saveGame(GameState state, String saveName) {
        Path saveFile = SAVE_DIR.resolve(saveName + ".save");

        try {
            Files.createDirectories(SAVE_DIR);
        } catch (IOException e) {
            throw new UncheckedIOException("Не удалось создать директорию сохранений", e);
        }

        try (BufferedWriter writer = Files.newBufferedWriter(saveFile,
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {

            Player player = state.getPlayer();
            StringBuilder sb = new StringBuilder(2048);

            // данные игрока
            sb.append("player;")
                    .append(player.getName()).append(";")
                    .append(player.getHp()).append(";")
                    .append(player.getAttack()).append("\n");

            // инвентарь
            sb.append("inventory;");
            if (!player.getInventory().isEmpty()) {
                boolean first = true;
                for (Item item : player.getInventory()) {
                    if (!first) sb.append(",");
                    if (item instanceof Potion) {
                        sb.append("potion:").append(item.getName()).append(":5");
                    } else if (item instanceof Weapon) {
                        sb.append("weapon:").append(item.getName()).append(":3");
                    } else if (item instanceof Key) {
                        sb.append("key:").append(item.getName());
                    } else {
                        sb.append("item:").append(item.getName());
                    }
                    first = false;
                }
            }
            sb.append("\n");

            // сохраняем ВСЕ комнаты
            sb.append("world;").append(serializeWorld(state)).append("\n");

            // Текущая комната
            sb.append("current_room;").append(state.getCurrent().getName()).append("\n");

            // Счет
            sb.append("score;").append(state.getScore()).append("\n");

            writer.write(sb.toString());
            System.out.println("Игра сохранена в: " + saveFile.toAbsolutePath());

        } catch (IOException e) {
            throw new UncheckedIOException("Ошибка при сохранении игры", e);
        }
    }

    public static boolean loadGame(GameState state, String saveName) {
        // + валидация данных
        if (saveName == null || saveName.trim().isEmpty()) {
            throw new InvalidCommandException("Имя сохранения не может быть пустым");
        }

        Path saveFile = SAVE_DIR.resolve(saveName + ".save");

        if (!Files.exists(saveFile)) {
            System.out.println("Сохранение '" + saveName + "' не найдено.");
            return false;
        }

        try (BufferedReader reader = Files.newBufferedReader(saveFile);
             Scanner scanner = new Scanner(reader)) {

            Map<String, String> saveData = new HashMap<>();
            while (scanner.hasNextLine()) {
                String line = scanner.nextLine();
                String[] parts = line.split(";", 2);
                if (parts.length == 2) {
                    saveData.put(parts[0], parts[1]);
                }
            }

            // восстановление всего мира перед восстановлением текущей комнаты
            if (saveData.containsKey("world")) {
                deserializeWorld(state, saveData.get("world"));
            }

            // восстановление игрока
            String[] playerData = saveData.get("player").split(";");
            Player player = new Player(playerData[0],
                    Integer.parseInt(playerData[1]),
                    Integer.parseInt(playerData[2]));
            state.setPlayer(player);

            // восст инвентарь
            player.getInventory().clear();
            String inventoryStr = saveData.get("inventory");
            if (inventoryStr != null && !inventoryStr.isEmpty()) {
                try (Scanner invScanner = new Scanner(inventoryStr)) {
                    invScanner.useDelimiter(",");
                    while (invScanner.hasNext()) {
                        String itemStr = invScanner.next();
                        String[] itemParts = itemStr.split(":");
                        if (itemParts.length >= 2) {
                            Item item = createItemFromString(itemParts);
                            if (item != null) {
                                player.getInventory().add(item);
                            }
                        }
                    }
                }
            }

            // восст текущей комнаты
            String currentRoomName = saveData.get("current_room");
            if (currentRoomName != null) {
                Room currentRoom = findRoomByName(state, currentRoomName);
                if (currentRoom != null) {
                    state.setCurrent(currentRoom);
                    System.out.println("Текущая комната восстановлена: " + currentRoomName);
                } else {
                    System.out.println("Ошибка: комната '" + currentRoomName + "' не найдена");
                    return false;
                }
            }

            // восст счет
            if (saveData.containsKey("score")) {
                // Сбрасываем счет и устанавливаем загруженное значение
                state.addScore(-state.getScore()); // обнуляем
                state.addScore(Integer.parseInt(saveData.get("score")));
            }

            System.out.println("Игра загружена из: " + saveFile.toAbsolutePath());
            return true;

        } catch (IOException e) {
            throw new UncheckedIOException("Не удалось загрузить игру", e);
        } catch (NumberFormatException e) {
            throw new InvalidCommandException("Файл сохранения поврежден: неверный формат чисел");
        }
    }


    private static void deserializeWorld(GameState state, String worldData) {
        Map<String, Room> world = new HashMap<>();
        String[] roomDataArray = worldData.split("\\|");

        // создаем все комнаты
        for (String roomData : roomDataArray) {
            String[] parts = roomData.split(";");
            if (parts.length >= 5) {
                String roomName = parts[0];
                String description = parts[1].replace(",", ";"); // восстанавливаем оригинальное описание
                Room room = new Room(roomName, description);
                world.put(roomName, room);

                // восст предметы в комнате
                if (!"none".equals(parts[2])) {
                    String[] itemStrings = parts[2].split(",");
                    for (String itemStr : itemStrings) {
                        String[] itemParts = itemStr.split(":");
                        Item item = createItemFromString(itemParts);
                        if (item != null) {
                            room.getItems().add(item);
                        }
                    }
                }

                // восст монстра
                if (!"none".equals(parts[3])) {
                    String[] monsterParts = parts[3].split(":");
                    if (monsterParts.length >= 3) {
                        Monster monster = new Monster(monsterParts[0],
                                Integer.parseInt(monsterParts[1]),
                                Integer.parseInt(monsterParts[2]));
                        room.setMonster(monster);
                    }
                }
            }
        }

        // восст связи между комнатами
        for (String roomData : roomDataArray) {
            String[] parts = roomData.split(";");
            if (parts.length >= 5) {
                String roomName = parts[0];
                Room currentRoom = world.get(roomName);

                // восст соседей
                if (!parts[4].isEmpty()) {
                    String[] neighborPairs = parts[4].split(",");
                    for (String pair : neighborPairs) {
                        String[] neighborParts = pair.split(":");
                        if (neighborParts.length == 2) {
                            String direction = neighborParts[0];
                            String neighborName = neighborParts[1];
                            Room neighborRoom = world.get(neighborName);
                            if (neighborRoom != null) {
                                currentRoom.getNeighbors().put(direction, neighborRoom);
                            }
                        }
                    }
                }
            }
        }

        state.setWorld(world);
    }

    public static void saveScore(String playerName, int score) {
        try {
            try (FileWriter fw = new FileWriter(SCORES_FILE.toFile(), true);
                 BufferedWriter writer = new BufferedWriter(fw);
                 PrintWriter pw = new PrintWriter(writer)) {

                if (!SCORES_FILE.toFile().exists() || SCORES_FILE.toFile().length() == 0) {
                    pw.println("timestamp,player_name,score");
                }

                pw.printf("%s,%s,%d%n", LocalDateTime.now(), playerName, score);
            }
        } catch (IOException e) {
            System.err.println("Не удалось сохранить счет: " + e.getMessage());
        }
    }

    public static void displaySavedGames() {
        try {
            if (!Files.exists(SAVE_DIR)) {
                Files.createDirectories(SAVE_DIR);
                System.out.println("Директория сохранений создана: " + SAVE_DIR.toAbsolutePath());
                System.out.println("Нет доступных сохранений.");
                return;
            }

            try (DirectoryStream<Path> stream = Files.newDirectoryStream(SAVE_DIR, "*.save")) {
                System.out.println("Доступные сохранения:");
                List<Path> saves = new ArrayList<>();

                for (Path path : stream) {
                    saves.add(path);
                }

                if (saves.isEmpty()) {
                    System.out.println("  (нет сохранений)");
                    return;
                }

                saves.sort((path1, path2) -> {
                    try {
                        FileTime time1 = Files.getLastModifiedTime(path1);
                        FileTime time2 = Files.getLastModifiedTime(path2);
                        return time2.compareTo(time1);
                    } catch (IOException e) {
                        return 0;
                    }
                });

                for (Path save : saves) {
                    String name = save.getFileName().toString().replace(".save", "");
                    try {
                        FileTime time = Files.getLastModifiedTime(save);
                        System.out.printf("- %s (изменено: %s)%n", name, time);
                    } catch (IOException e) {
                        System.out.printf("- %s (ошибка чтения времени)%n", name);
                    }
                }
            }
        } catch (IOException e) {
            System.out.println("Ошибка при чтении списка сохранений: " + e.getMessage());
        }
    }

    public static void printScores() {
        if (!Files.exists(SCORES_FILE)) {
            System.out.println("Пока нет результатов.");
            return;
        }
        try (BufferedReader r = Files.newBufferedReader(SCORES_FILE)) {
            System.out.println("=== ТАБЛИЦА ЛИДЕРОВ (ТОП-10) ===");

            Map<String, Integer> bestScores = new HashMap<>();
            Map<String, String> playerFirstSeen = new HashMap<>();

            r.lines().skip(1)
                    .forEach(line -> {
                        String[] parts = line.split(",");
                        if (parts.length >= 3) {
                            String player = parts[1];
                            int score = Integer.parseInt(parts[2]);
                            String timestamp = parts[0];

                            if (!playerFirstSeen.containsKey(player)) {
                                playerFirstSeen.put(player, timestamp);
                            }
                            bestScores.merge(player, score, Math::max);
                        }
                    });

            bestScores.entrySet().stream()
                    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                    .limit(10)
                    .forEach(entry -> {
                        String player = entry.getKey();
                        int score = entry.getValue();
                        String firstPlayed = playerFirstSeen.get(player);
                        System.out.printf("- %s — %d очков (первая игра: %s)%n",
                                player, score, firstPlayed != null ? firstPlayed.substring(0, 10) : "неизвестно");
                    });

            System.out.println("================================");
        } catch (IOException e) {
            System.err.println("Ошибка чтения результатов: " + e.getMessage());
        }
    }


    private static String serializeWorld(GameState state) {
        StringBuilder sb = new StringBuilder();
        Map<String, Room> world = state.getWorld();

        boolean firstRoom = true;
        for (Room room : world.values()) {
            if (!firstRoom) sb.append("|");
            sb.append(room.getName()).append(";")
                    .append(room.getDescription().replace(";", ",")).append(";")
                    .append(serializeItems(room.getItems())).append(";")
                    .append(serializeMonster(room.getMonster())).append(";")
                    .append(serializeNeighbors(room, world));
            firstRoom = false;
        }
        return sb.toString();
    }

    private static String serializeItems(List<Item> items) {
        if (items.isEmpty()) return "none";
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Item item : items) {
            if (!first) sb.append(",");
            if (item instanceof Potion) {
                sb.append("potion:").append(item.getName());
            } else if (item instanceof Weapon) {
                sb.append("weapon:").append(item.getName());
            } else if (item instanceof Key) {
                sb.append("key:").append(item.getName());
            } else {
                sb.append("item:").append(item.getName());
            }
            first = false;
        }
        return sb.toString();
    }

    private static String serializeMonster(Monster monster) {
        if (monster == null) return "none";
        return monster.getName() + ":" + monster.getLevel() + ":" + monster.getHp();
    }

    private static String serializeNeighbors(Room room, Map<String, Room> world) {
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, Room> entry : room.getNeighbors().entrySet()) {
            if (!first) sb.append(",");
            sb.append(entry.getKey()).append(":").append(entry.getValue().getName());
            first = false;
        }
        return sb.toString();
    }


    private static Room findRoomByName(GameState state, String roomName) {
        if (state.getWorld() != null && !state.getWorld().isEmpty()) {
            return state.getWorld().get(roomName);
        }
        return findRoomRecursive(state.getCurrent(), roomName, new HashSet<>());
    }

    private static Room findRoomRecursive(Room startRoom, String targetName, Set<Room> visited) {
        if (startRoom == null || visited.contains(startRoom)) {
            return null;
        }
        visited.add(startRoom);

        if (startRoom.getName().equals(targetName)) {
            return startRoom;
        }

        for (Room neighbor : startRoom.getNeighbors().values()) {
            Room found = findRoomRecursive(neighbor, targetName, visited);
            if (found != null) {
                return found;
            }
        }
        return null;
    }

    private static Item createItemFromString(String[] parts) {
        return switch (parts[0]) {
            case "potion" -> new Potion(parts[1], parts.length > 2 ? Integer.parseInt(parts[2]) : 5);
            case "weapon" -> new Weapon(parts[1], parts.length > 2 ? Integer.parseInt(parts[2]) : 3);
            case "key" -> new Key(parts[1]);
            default -> null;
        };
    }

    private record Score(String player, int score) {
    }
}
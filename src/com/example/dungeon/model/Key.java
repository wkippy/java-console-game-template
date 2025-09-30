package com.example.dungeon.model;

import java.util.Map;

public class Key extends Item {
    public Key(String name) {
        super(name);
    }

    @Override
    public void apply(GameState ctx) {
        Room current = ctx.getCurrent();
        Player player = ctx.getPlayer();
        Map<String, Room> world = ctx.getWorld();

        // Проверяем все возможные запертые двери
        boolean doorOpened = false;

        // Пещера -> Сокровищница
        if (current.getName().equals("Пещера")) {
            Room treasure = world.get("Сокровищница");
            if (treasure != null && !current.getNeighbors().containsValue(treasure)) {
                current.getNeighbors().put("north", treasure);
                System.out.println("🔑 Вы использовали " + getName() + " и открыли дверь в сокровищницу!");
                doorOpened = true;
            }
        }

        // Сокровищница -> Пещера
        else if (current.getName().equals("Сокровищница")) {
            Room cave = world.get("Пещера");
            if (cave != null && !current.getNeighbors().containsValue(cave)) {
                current.getNeighbors().put("south", cave);
                System.out.println("🔑 Вы использовали " + getName() + " и открыли дверь обратно в пещеру!");
                doorOpened = true;
            }
        }

        if (doorOpened) {
            player.getInventory().remove(this);
            ctx.addScore(20);
        } else {
            System.out.println("Ключ звенит. Возможно, где-то есть дверь...");
        }
    }
}

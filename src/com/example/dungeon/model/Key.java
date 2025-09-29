package com.example.dungeon.model;

public class Key extends Item {
    public Key(String name) {
        super(name);
    }

    @Override
    public void apply(GameState ctx) {
        Room current = ctx.getCurrent();

        // проверка есть ли запертые двери в текущей комнате
        if (current.getName().equals("Пещера")) {
            Room treasure = ctx.getWorld().get("Сокровищница");
            if (treasure != null && !current.getNeighbors().containsValue(treasure)) {
                // Открываем дверь в сокровищницу
                current.getNeighbors().put("north", treasure);
                System.out.println("Вы использовали " + getName() + " и открыли дверь в сокровищницу!");
                ctx.getPlayer().getInventory().remove(this);
                ctx.addScore(20); // Бонус за открытие двери
                return;
            }
        }

        System.out.println("Ключ звенит. Возможно, где-то есть дверь...");
    }
}

package com.example.dungeon.model;

import java.util.HashMap;
import java.util.Map;

public class GameState {
    private Player player;
    private Room current;
    private int score;
    private Map<String, Room> world = new HashMap<>(); // NEW

    public Map<String, Room> getWorld() { return world; } // NEW
    public void setWorld(Map<String, Room> world) { this.world = world; }

    public Player getPlayer() {
        return player;
    }

    public void setPlayer(Player p) {
        this.player = p;
    }

    public Room getCurrent() {
        return current;
    }

    public void setCurrent(Room r) {
        this.current = r;
    }

    public int getScore() {
        return score;
    }

    public void addScore(int d) {
        this.score += d;
    }
}

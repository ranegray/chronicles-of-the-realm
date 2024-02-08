#pragma once

#include <string>

class Character {
    public:
        std::string name;
        int health;
        int level;
        int xp;

        Character(std::string name, int health, int level, int xp);

        void viewStats();
};
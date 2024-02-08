#include "Character.h"
#include <iostream>
#include <string>

Character::Character(std::string charName, int charLevel, int charXP, int charHealth)
    : name(charName), level(charLevel), xp(charXP), health(charHealth) {}

void Character::viewStats() {
    std::cout << "Name: " << name << std::endl;
    std::cout << "Level: " << level << " | XP: " << xp << std::endl;
    std::cout << "Health: " << health << std::endl;
}
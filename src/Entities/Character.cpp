#include "Character.h"
#include <iostream>
#include <string>

Character::Character(std::string charName, int charHealth, int charLevel,
                     int charXP)
    : name(charName), health(charHealth), level(charLevel), xp(charXP) {}

void Character::viewStats() {
  std::cout << "Name: " << name << std::endl;
  std::cout << "Level: " << level << " | XP: " << xp << std::endl;
  std::cout << "Health: " << health << std::endl;
}

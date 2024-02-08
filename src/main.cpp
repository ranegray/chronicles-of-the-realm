#include <iostream>
using std::cin;
using std::cout;
using std::endl;

#include <string>
using std::string;

#include "Entities/Character.h"

int main() {
  // initializing game state
  system("clear");
  string playerName;
  string playerInput;

  cout << "Welcome to the game! Let's begin by creating your character."
       << endl;
  cout << "Enter your character's name: ";
  cin >> playerName;

  Character player(playerName, 10, 0, 0);

  cout << "Great! Welcome to Chronicles of the Realm, " << player.name << "."
       << endl;
  cout << "Here are your character stats. \n(Type \"stats\" at anytime to see "
          "your current stats)"
       << endl;

  player.viewStats();

  while (playerInput != "quit") {
    cout << "\nWhat would you like to do? (Type \"quit\" at anytime to exit "
            "the game) ";
    cin >> playerInput;

    if (playerInput == "stats") {
      player.viewStats();
    }
  }

  return 0;
}

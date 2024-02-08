#include <iostream>
    using std::cout;
    using std::cin;
    using std::endl;

#include <string>
    using std::string;

#include "Entities/Character.h"

int main() {
    // initializing game state
    system("clear");
    string playerName;

    cout << "Welcome to the game! Let's begin by creating your character." << endl;
    cout << "Enter your character's name: ";
    cin >> playerName;

    Character player(playerName, 10, 0, 0);

    cout << "Great! Welcome to Chronicles of the Realm, " << player.name << "." << endl;
    cout << "Here are your character stats. (Type \"stats\" at anytime to see your current stats)" << endl;
    
    player.viewStats();

    return 0;
}
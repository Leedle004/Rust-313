#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);

    int spaces = 0;
    for (char c : line) {
        if (c == ' ') {
            spaces += 1;
        }
    }
    std::cout << spaces << "\n";
    return 0;
}

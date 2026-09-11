#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);
    std::cout << line.size() << "\n";
    return 0;
}

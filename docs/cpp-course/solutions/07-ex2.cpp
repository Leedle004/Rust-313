#include <iostream>
#include <string>

int main() {
    std::string word;
    std::cin >> word;

    bool palindrome = true;
    for (std::size_t i = 0; i < word.size() / 2; ++i) {
        if (word[i] != word[word.size() - 1 - i]) {
            palindrome = false;
            break;
        }
    }

    if (palindrome) {
        std::cout << "yes\n";
    } else {
        std::cout << "no\n";
    }
    return 0;
}

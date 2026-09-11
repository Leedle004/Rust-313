#include <iostream>

int main() {
    int score = 0;
    std::cout << "请输入分数：";
    std::cin >> score;

    if (score < 0 || score > 100) {
        std::cout << "invalid\n";
    } else if (score >= 90) {
        std::cout << "A\n";
    } else if (score >= 80) {
        std::cout << "B\n";
    } else if (score >= 60) {
        std::cout << "C\n";
    } else {
        std::cout << "D\n";
    }
    return 0;
}

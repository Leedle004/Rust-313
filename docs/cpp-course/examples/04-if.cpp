#include <iostream>

int main() {
    int score = 0;
    std::cout << "请输入分数：";
    std::cin >> score;

    if (score >= 90) {
        std::cout << "优\n";
    } else if (score >= 60) {
        std::cout << "及格\n";
    } else {
        std::cout << "不及格\n";
    }
    return 0;
}

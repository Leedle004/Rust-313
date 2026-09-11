#include <iostream>

int main() {
    int total_seconds = 0;
    std::cout << "请输入秒数：";
    std::cin >> total_seconds;

    const int minutes = total_seconds / 60;
    const int seconds = total_seconds % 60;
    std::cout << minutes << " 分 " << seconds << " 秒\n";
    return 0;
}

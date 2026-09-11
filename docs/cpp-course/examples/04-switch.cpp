#include <iostream>

int main() {
    int choice = 0;
    std::cout << "1 加法  2 减法  0 退出\n请选择：";
    std::cin >> choice;

    switch (choice) {
        case 1:
            std::cout << "你选了加法\n";
            break;
        case 2:
            std::cout << "你选了减法\n";
            break;
        case 0:
            std::cout << "再见\n";
            break;
        default:
            std::cout << "无效选项\n";
            break;
    }
    return 0;
}

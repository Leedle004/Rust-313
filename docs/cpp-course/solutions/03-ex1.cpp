#include <iostream>

int main() {
    int n = 0;
    std::cout << "请输入一个整数：";
    std::cin >> n;

    if (n % 2 == 0) {
        std::cout << "even\n";
    } else {
        std::cout << "odd\n";
    }
    return 0;
}

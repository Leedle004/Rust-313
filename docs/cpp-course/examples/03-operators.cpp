#include <iostream>

int main() {
    int a = 7;
    int b = 2;

    std::cout << "a + b = " << (a + b) << "\n";
    std::cout << "a - b = " << (a - b) << "\n";
    std::cout << "a * b = " << (a * b) << "\n";
    std::cout << "a / b = " << (a / b) << "  （整数除法）\n";
    std::cout << "a % b = " << (a % b) << "\n";
    std::cout << "7.0 / 2 = " << (7.0 / 2) << "\n";

    int n = 10;
    n += 5;
    std::cout << "n += 5 之后：" << n << "\n";

    bool even = (n % 2 == 0);
    bool in_range = (n >= 0 && n <= 20);
    std::cout << "n 是偶数？" << even << "\n";
    std::cout << "n 在 0 到 20？" << in_range << "\n";
    return 0;
}

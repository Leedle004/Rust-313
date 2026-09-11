#include <iostream>

int main() {
    int a = 0;
    int b = 0;

    std::cout << "请输入两个整数：";
    std::cin >> a >> b;

    std::cout << "和是 " << (a + b) << "\n";
    return 0;
}

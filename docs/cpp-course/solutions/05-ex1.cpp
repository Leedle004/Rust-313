#include <iostream>

int max2(int a, int b) {
    if (a > b) {
        return a;
    }
    return b;
}

int main() {
    int a = 0;
    int b = 0;
    std::cout << "请输入两个整数：";
    std::cin >> a >> b;
    std::cout << max2(a, b) << "\n";
    return 0;
}

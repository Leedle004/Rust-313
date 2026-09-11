#include <iostream>

void swap_int(int& a, int& b) {
    int tmp = a;
    a = b;
    b = tmp;
}

int main() {
    int a = 0;
    int b = 0;
    std::cout << "请输入两个整数：";
    std::cin >> a >> b;
    swap_int(a, b);
    std::cout << a << " " << b << "\n";
    return 0;
}

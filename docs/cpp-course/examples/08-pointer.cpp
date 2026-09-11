#include <iostream>

int main() {
    int x = 10;
    int* p = &x;

    std::cout << "x 的值：" << x << "\n";
    std::cout << "*p 的值：" << *p << "\n";

    *p = 20;
    std::cout << "通过指针修改后，x = " << x << "\n";

    p = nullptr;
    if (p == nullptr) {
        std::cout << "现在 p 不指向任何对象\n";
    }
    return 0;
}

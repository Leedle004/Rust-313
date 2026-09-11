#include <iostream>

bool is_even(int n) {
    return n % 2 == 0;
}

int main() {
    int n = 0;
    std::cout << "请输入一个整数：";
    std::cin >> n;
    if (is_even(n)) {
        std::cout << "even\n";
    } else {
        std::cout << "odd\n";
    }
    return 0;
}

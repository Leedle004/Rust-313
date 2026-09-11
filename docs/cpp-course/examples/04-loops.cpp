#include <iostream>

int main() {
    std::cout << "while 计数：\n";
    int n = 1;
    while (n <= 3) {
        std::cout << n << "\n";
        n += 1;
    }

    std::cout << "for 计数：\n";
    for (int i = 1; i <= 3; ++i) {
        std::cout << i << "\n";
    }

    std::cout << "1 到 5 里跳过 3：\n";
    for (int i = 1; i <= 5; ++i) {
        if (i == 3) {
            continue;
        }
        std::cout << i << "\n";
    }
    return 0;
}

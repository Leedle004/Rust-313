#include <iostream>

int main() {
    const int secret = 7;
    int guess = 0;

    std::cout << "猜一个 1 到 10 的整数：";
    while (std::cin >> guess) {
        if (guess == secret) {
            std::cout << "correct\n";
            break;
        }
        if (guess > secret) {
            std::cout << "too big\n";
        } else {
            std::cout << "too small\n";
        }
        std::cout << "再猜：";
    }
    return 0;
}

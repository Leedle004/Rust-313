#include <iostream>

int main() {
    for (int i = 1; i <= 20; ++i) {
        if (i % 3 == 0) {
            std::cout << i << "\n";
        }
    }
    return 0;
}

#include <iostream>

void print_if_any(const int* p) {
    if (p == nullptr) {
        std::cout << "none\n";
        return;
    }
    std::cout << *p << "\n";
}

int main() {
    print_if_any(nullptr);

    int x = 42;
    print_if_any(&x);
    return 0;
}

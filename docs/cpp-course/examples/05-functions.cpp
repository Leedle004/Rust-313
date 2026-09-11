#include <iostream>
#include <string>

int add(int a, int b) {
    return a + b;
}

bool is_adult(int age) {
    return age >= 18;
}

void greet(const std::string& name) {
    std::cout << "你好，" << name << "\n";
}

int main() {
    greet("Ada");
    std::cout << "2 + 3 = " << add(2, 3) << "\n";

    int age = 20;
    if (is_adult(age)) {
        std::cout << "已成年\n";
    } else {
        std::cout << "未成年\n";
    }
    return 0;
}

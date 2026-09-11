#include <iostream>
#include <string>

void add_one(int& n) {
    n += 1;
}

void print_name(const std::string& name) {
    std::cout << name << "\n";
}

int main() {
    int x = 10;
    int& r = x;
    r = 20;
    std::cout << "x = " << x << "\n";

    add_one(x);
    std::cout << "加一之后 x = " << x << "\n";

    print_name("Ada");
    return 0;
}

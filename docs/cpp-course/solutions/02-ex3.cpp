#include <iostream>
#include <string>

int main() {
    std::string name;
    int birth_year = 0;

    std::cout << "请输入姓名：";
    std::cin >> name;
    std::cout << "请输入出生年：";
    std::cin >> birth_year;

    const int age = 2026 - birth_year;
    std::cout << name << " 大约 " << age << " 岁。\n";
    return 0;
}

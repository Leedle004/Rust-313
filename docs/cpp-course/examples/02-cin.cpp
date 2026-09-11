#include <iostream>
#include <string>

int main() {
    std::string name;
    int age = 0;

    std::cout << "请输入姓名：";
    std::cin >> name;

    std::cout << "请输入年龄：";
    std::cin >> age;

    std::cout << name << "，" << age << " 岁。\n";
    return 0;
}

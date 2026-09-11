#include <iostream>
#include <string>

int main() {
    std::string line;
    std::cout << "请输入一整行：";
    std::getline(std::cin, line);
    std::cout << "你输入了：" << line << "\n";
    std::cout << "长度：" << line.size() << "\n";
    return 0;
}

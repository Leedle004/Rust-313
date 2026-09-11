#include <iostream>
#include <string>

int main() {
    std::string name = "Ada";
    name += " Lovelace";

    std::cout << name << "\n";
    std::cout << "长度：" << name.size() << "\n";
    std::cout << "前三个字符：" << name.substr(0, 3) << "\n";

    if (name.find("Love") != std::string::npos) {
        std::cout << "包含 Love\n";
    }
    return 0;
}

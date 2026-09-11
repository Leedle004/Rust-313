#include <iostream>

int main() {
    int scores[3] = {90, 80, 70};

    std::cout << "三个分数：\n";
    for (int i = 0; i < 3; ++i) {
        std::cout << scores[i] << "\n";
    }
    return 0;
}

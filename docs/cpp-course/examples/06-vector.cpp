#include <iostream>
#include <vector>

int main() {
    std::vector<int> scores = {90, 80, 70};
    scores.push_back(85);

    std::cout << "个数：" << scores.size() << "\n";

    int sum = 0;
    for (int s : scores) {
        sum += s;
    }
    std::cout << "总和：" << sum << "\n";
    std::cout << "最后一个：" << scores.back() << "\n";
    return 0;
}

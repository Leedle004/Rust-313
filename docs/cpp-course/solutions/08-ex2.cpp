#include <iostream>
#include <vector>

int sum(const std::vector<int>& a) {
    int total = 0;
    for (int x : a) {
        total += x;
    }
    return total;
}

int main() {
    std::vector<int> scores = {90, 80, 70};
    std::cout << sum(scores) << "\n";
    return 0;
}

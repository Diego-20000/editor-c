#include <stdio.h>
int f(int x, int y);
int f(int x) { return x; }
int main() {
    printf("%d\n", f(2));
    return 0;
}

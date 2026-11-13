#include <stdio.h>
int main() {
    for (float X = 0.0f; X <= 1.0f; X += 0.1f)
        printf("%.9f\n", X);
}
